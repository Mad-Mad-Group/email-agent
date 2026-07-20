/**
 * 一次性 migration：將所有冇 userId 嘅 calendar events 歸屬俾第一個 admin/super_admin。
 *
 * 用法：npx ts-node scripts/migrate-calendar-userid.ts
 */
import { MongoClient } from 'mongodb';

const URI = process.env.MONGODB_URI || 'mongodb://leadteam:leadteam2026@localhost:27017/lead_scraper';

async function main() {
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db();

  // 搵第一個 admin / super_admin
  const admin = await db.collection('users').findOne(
    { role: { $in: ['admin', 'super_admin'] } },
    { sort: { created_at: 1 } },
  );

  if (!admin) {
    console.log('❌ 搵唔到 admin 用戶，跳過 migration');
    await client.close();
    return;
  }

  const adminId = admin._id.toString();
  console.log(`✅ 搵到 admin: ${admin.name} (${admin.email}) → ${adminId}`);

  // 將所有冇 userId 嘅 calendar events 歸屬俾 admin
  const result = await db.collection('calendar_events').updateMany(
    { $or: [{ userId: { $exists: false } }, { userId: null }, { userId: '' }] },
    { $set: { userId: adminId } },
  );

  console.log(`✅ 已更新 ${result.modifiedCount} 個 calendar events（歸屬俾 ${admin.name}）`);

  await client.close();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
