"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const dotenv_1 = require("dotenv");
const path_1 = require("path");
const mongoose_1 = __importDefault(require("mongoose"));
(0, dotenv_1.config)({ path: (0, path_1.resolve)(__dirname, '../../.env') });
(0, dotenv_1.config)({ path: (0, path_1.resolve)(__dirname, '../.env') });
const APPLY = process.argv.includes('--apply');
async function main() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
        console.error('MONGODB_URI not found in cms/server/.env — abort.');
        process.exit(1);
    }
    await mongoose_1.default.connect(uri);
    const db = mongoose_1.default.connection.db;
    const cancelledCampaigns = await db.collection('campaigns')
        .find({ status: 'cancelled' })
        .project({ campaign_id: 1, keyword: 1, location: 1, _created_at: 1 })
        .toArray();
    const cancelledIds = cancelledCampaigns.map((c) => c.campaign_id);
    const pendingTasks = await db.collection('tasks')
        .find({ status: 'pending', skill_id: 'S1' })
        .project({ task_id: 1, title: 1, params: 1, _created_at: 1 })
        .sort({ _created_at: -1 })
        .toArray();
    console.log(`\n[DRY-RUN] Found ${pendingTasks.length} pending S1 (search) task(s)`);
    for (const t of pendingTasks) {
        console.log(`  - ${t.task_id} | "${t.title}" | created=${t._created_at} | kw=${t.params?.keyword} loc=${t.params?.location}`);
    }
    const runningTasks = await db.collection('tasks')
        .find({ status: 'running', skill_id: 'S1' })
        .project({ task_id: 1, title: 1, _created_at: 1, assigned_agent_id: 1 })
        .toArray();
    console.log(`\n[DRY-RUN] Found ${runningTasks.length} running S1 task(s)`);
    for (const t of runningTasks) {
        console.log(`  - ${t.task_id} | "${t.title}" | agent=${t.assigned_agent_id} | created=${t._created_at}`);
    }
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
        await mongoose_1.default.disconnect();
        return;
    }
    const pendingIds = pendingTasks.map((t) => t.task_id);
    if (pendingIds.length > 0) {
        const r = await db.collection('tasks').deleteMany({ task_id: { $in: pendingIds } });
        console.log(`\n[APPLY] Deleted ${r.deletedCount} pending S1 task(s)`);
    }
    const runningIds = runningTasks.map((t) => t.task_id);
    if (runningIds.length > 0) {
        const r = await db.collection('tasks').updateMany({ task_id: { $in: runningIds } }, { $set: { status: 'failed', error: { message: 'cancelled by cleanup script' }, _updated_at: new Date().toISOString() } });
        console.log(`[APPLY] Marked ${r.modifiedCount} running S1 task(s) as failed`);
    }
    const fanoutIds = fanoutTasks.map((t) => t.task_id);
    if (fanoutIds.length > 0) {
        const r = await db.collection('tasks').deleteMany({ task_id: { $in: fanoutIds } });
        console.log(`[APPLY] Deleted ${r.deletedCount} pending fan-out task(s) tied to cancelled campaigns`);
    }
    const runningFanoutIds = runningFanout.map((t) => t.task_id);
    if (runningFanoutIds.length > 0) {
        const r = await db.collection('tasks').updateMany({ task_id: { $in: runningFanoutIds } }, { $set: { status: 'failed', error: { message: 'cancelled by cleanup script (parent campaign cancelled)' }, _updated_at: new Date().toISOString() } });
        console.log(`[APPLY] Marked ${r.modifiedCount} running fan-out task(s) as failed`);
    }
    const campaignIds = runningCampaigns.map((c) => c.campaign_id);
    if (campaignIds.length > 0) {
        const r = await db.collection('campaigns').updateMany({ campaign_id: { $in: campaignIds } }, { $set: { status: 'cancelled', _updated_at: new Date().toISOString() } });
        console.log(`[APPLY] Marked ${r.modifiedCount} campaign(s) as cancelled`);
    }
    await mongoose_1.default.disconnect();
    console.log('\nDone.');
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=cleanup-pending-search-tasks.js.map