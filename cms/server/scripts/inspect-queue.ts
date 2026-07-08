import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';

loadEnv({ path: resolve(__dirname, '../.env') });

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) { console.error('no MONGODB_URI'); process.exit(1); }
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;

  console.log('=== Recent SEARCH tasks (last 20) ===');
  const tasks = await db.collection('tasks')
    .find({ skill_id: 'SEARCH' })
    .sort({ _created_at: -1 })
    .limit(20)
    .toArray();
  for (const t of tasks) {
    console.log(t.task_id, '|', t.status, '|', 'agent=' + (t.assigned_agent_id || 'none'), '|', t._created_at);
  }

  console.log('\n=== Recent campaigns (last 20) ===');
  const camps = await db.collection('campaigns')
    .find({})
    .sort({ _created_at: -1 })
    .limit(20)
    .toArray();
  for (const c of camps) {
    console.log(c.campaign_id, '|', c.status, '|', c._created_at, '|', `"${c.keyword}" "${c.location}" tc=${c.target_count}`);
  }

  console.log('\n=== ALL tasks (any status) — last 30 ===');
  const allTasks = await db.collection('tasks')
    .find({})
    .sort({ _created_at: -1 })
    .limit(30)
    .toArray();
  for (const t of allTasks) {
    console.log(t.task_id, '|', t.status, '|', 'skill=' + t.skill_id, '|', 'stage=' + (t.params?.pipeline_stage || '-'), '|', t._created_at, '|', t.title);
  }

  console.log('\n=== Search by task_id TASK-cc8bd530 ===');
  const target = await db.collection('tasks').findOne({ task_id: 'TASK-cc8bd530' });
  console.log(target ? JSON.stringify(target, null, 2) : 'NOT FOUND');

  console.log('\n=== Tasks count by skill ===');
  const bySkill = await db.collection('tasks').aggregate([
    { $group: { _id: '$skill_id', n: { $sum: 1 } } }
  ]).toArray();
  console.log(JSON.stringify(bySkill));

  console.log('\n=== Tasks count by status ===');
  const counts = await db.collection('tasks').aggregate([
    { $group: { _id: '$status', n: { $sum: 1 } } }
  ]).toArray();
  console.log(JSON.stringify(counts));

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });