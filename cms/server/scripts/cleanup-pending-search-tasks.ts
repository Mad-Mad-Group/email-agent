/**
 * Cleanup script — kill pending + running S1 (search) tasks.
 *
 * Run from cms/server (uses server's node_modules):
 *   node_modules/.bin/ts-node scripts/cleanup-pending-search-tasks.ts           # dry-run
 *   node_modules/.bin/ts-node scripts/cleanup-pending-search-tasks.ts --apply   # delete
 *
 * Ponytail notes:
 * - Dry-run first. Always.
 * - Reads MONGODB_URI from cms/server/.env (NOT MONGO_URI).
 * - Targets S1 tasks (skill_id = "S1", see cms/server/src/tasks/dto/task-status.enum.ts).
 * - Marks orphaned campaigns (status=running, no live worker activity) as cancelled.
 *   Running S1 tasks are marked FAILED so worker drops the result instead of
 *   completing them — orchestrator won't spawn fan-out for cancelled campaigns.
 */

import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';

// Load server's .env explicitly.
loadEnv({ path: resolve(__dirname, '../../.env') });
loadEnv({ path: resolve(__dirname, '../.env') });

const APPLY = process.argv.includes('--apply');

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in cms/server/.env — abort.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db!;

  // 0. Find cancelled campaigns first — fan-out cleanup targets these.
  const cancelledCampaigns = await db.collection('campaigns')
    .find({ status: 'cancelled' })
    .project({ campaign_id: 1, keyword: 1, location: 1, _created_at: 1 })
    .toArray();
  const cancelledIds = cancelledCampaigns.map((c: any) => c.campaign_id);

  // 1. Find pending S1 tasks (these are queued, no worker has them).
  const pendingTasks = await db.collection('tasks')
    .find({ status: 'pending', skill_id: 'S1' })
    .project({ task_id: 1, title: 1, params: 1, _created_at: 1 })
    .sort({ _created_at: -1 })
    .toArray();

  console.log(`\n[DRY-RUN] Found ${pendingTasks.length} pending S1 (search) task(s)`);
  for (const t of pendingTasks) {
    console.log(`  - ${t.task_id} | "${t.title}" | created=${t._created_at} | kw=${t.params?.keyword} loc=${t.params?.location}`);
  }

  // 1b. Find running S1 tasks (worker may have just claimed them).
  const runningTasks = await db.collection('tasks')
    .find({ status: 'running', skill_id: 'S1' })
    .project({ task_id: 1, title: 1, _created_at: 1, assigned_agent_id: 1 })
    .toArray();

  console.log(`\n[DRY-RUN] Found ${runningTasks.length} running S1 task(s)`);
  for (const t of runningTasks) {
    console.log(`  - ${t.task_id} | "${t.title}" | agent=${t.assigned_agent_id} | created=${t._created_at}`);
  }

  // 1c. Find fan-out tasks (S2/S3/S4) belonging to CANCELLED campaigns.
  //     These are pipeline tasks that worker would otherwise still process.
  const fanoutTasks = cancelledIds.length > 0
    ? await db.collection('tasks')
        .find({
          status: 'pending',
          skill_id: { $in: ['S2', 'S3', 'S4'] },
          'params.campaign_id': { $in: cancelledIds },
        })
        .project({ task_id: 1, title: 1, skill_id: 1, _created_at: 1, params: 1 })
        .sort({ _created_at: -1 })
        .toArray()
    : [];

  console.log(`\n[DRY-RUN] Found ${fanoutTasks.length} fan-out (S2/S3/S4) task(s) tied to cancelled campaigns`);
  for (const t of fanoutTasks) {
    console.log(`  - ${t.task_id} | skill=${t.skill_id} stage=${t.params?.pipeline_stage} | "${t.title}" | created=${t._created_at}`);
  }

  // 1d. Running fan-out tasks (worker mid-flight on cancelled pipelines).
  const runningFanout = cancelledIds.length > 0
    ? await db.collection('tasks')
        .find({
          status: 'running',
          skill_id: { $in: ['S2', 'S3', 'S4'] },
          'params.campaign_id': { $in: cancelledIds },
        })
        .project({ task_id: 1, skill_id: 1, _created_at: 1, assigned_agent_id: 1, params: 1 })
        .toArray()
    : [];

  console.log(`\n[DRY-RUN] Found ${runningFanout.length} running fan-out task(s) tied to cancelled campaigns`);
  for (const t of runningFanout) {
    console.log(`  - ${t.task_id} | skill=${t.skill_id} stage=${t.params?.pipeline_stage} | agent=${t.assigned_agent_id}`);
  }

  // 2. Find currently-running campaigns (still spawning fan-out).
  const runningCampaigns = await db.collection('campaigns')
    .find({ status: 'running' })
    .project({ campaign_id: 1, keyword: 1, location: 1, _created_at: 1 })
    .toArray();

  console.log(`\n[DRY-RUN] Found ${runningCampaigns.length} running campaign(s)`);
  for (const c of runningCampaigns) {
    console.log(`  - ${c.campaign_id} | "${c.keyword} ${c.location}" | created=${c._created_at}`);
  }

  if (!APPLY) {
    console.log('\n=== DRY-RUN only. Re-run with --apply to delete. ===');
    await mongoose.disconnect();
    return;
  }

  // 3a. Delete pending S1 tasks (worker will never claim them).
  const pendingIds = pendingTasks.map((t: any) => t.task_id);
  if (pendingIds.length > 0) {
    const r = await db.collection('tasks').deleteMany({ task_id: { $in: pendingIds } });
    console.log(`\n[APPLY] Deleted ${r.deletedCount} pending S1 task(s)`);
  }

  // 3b. Mark running S1 tasks as FAILED. Worker, when it tries to complete()
  //     them, will get 400 "not running" (TasksService.complete checks status
  //     === RUNNING). The fail marker also stops orchestrator from processing
  //     the result event if worker already reported complete.
  //     NOTE: Worker mid-scrape WILL still finish its current round before
  //     calling complete(). There's no clean way to abort a Hermes browser
  //     agent mid-execution without a cancel signal — accept the wasted CPU.
  const runningIds = runningTasks.map((t: any) => t.task_id);
  if (runningIds.length > 0) {
    const r = await db.collection('tasks').updateMany(
      { task_id: { $in: runningIds } },
      { $set: { status: 'failed', error: { message: 'cancelled by cleanup script' }, _updated_at: new Date().toISOString() } }
    );
    console.log(`[APPLY] Marked ${r.modifiedCount} running S1 task(s) as failed`);
  }

  // 3c. Delete pending fan-out (S2/S3/S4) tasks tied to cancelled campaigns.
  //     Without this, worker would still claim them and waste Hermes quota on
  //     a pipeline the user already abandoned.
  const fanoutIds = fanoutTasks.map((t: any) => t.task_id);
  if (fanoutIds.length > 0) {
    const r = await db.collection('tasks').deleteMany({ task_id: { $in: fanoutIds } });
    console.log(`[APPLY] Deleted ${r.deletedCount} pending fan-out task(s) tied to cancelled campaigns`);
  }

  // 3d. Mark running fan-out tasks as FAILED (same reasoning as 3b).
  const runningFanoutIds = runningFanout.map((t: any) => t.task_id);
  if (runningFanoutIds.length > 0) {
    const r = await db.collection('tasks').updateMany(
      { task_id: { $in: runningFanoutIds } },
      { $set: { status: 'failed', error: { message: 'cancelled by cleanup script (parent campaign cancelled)' }, _updated_at: new Date().toISOString() } }
    );
    console.log(`[APPLY] Marked ${r.modifiedCount} running fan-out task(s) as failed`);
  }

  // 3e. Mark orphaned running campaigns as cancelled so orchestrator skips fan-out.
  const campaignIds = runningCampaigns.map((c: any) => c.campaign_id);
  if (campaignIds.length > 0) {
    const r = await db.collection('campaigns').updateMany(
      { campaign_id: { $in: campaignIds } },
      { $set: { status: 'cancelled', _updated_at: new Date().toISOString() } }
    );
    console.log(`[APPLY] Marked ${r.modifiedCount} campaign(s) as cancelled`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});