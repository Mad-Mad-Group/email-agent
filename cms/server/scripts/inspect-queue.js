"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const dotenv_1 = require("dotenv");
const path_1 = require("path");
const mongoose_1 = __importDefault(require("mongoose"));
(0, dotenv_1.config)({ path: (0, path_1.resolve)(__dirname, '../.env') });
async function main() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
        console.error('no MONGODB_URI');
        process.exit(1);
    }
    await mongoose_1.default.connect(uri);
    const db = mongoose_1.default.connection.db;
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
    await mongoose_1.default.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
//# sourceMappingURL=inspect-queue.js.map