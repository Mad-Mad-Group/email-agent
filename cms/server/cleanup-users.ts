/**
 * 清除 users collection 中除 admin@test.com 以外嘅所有 user。
 * 用法: npx ts-node cleanup-users.ts
 *   或: npx tsx cleanup-users.ts
 */
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lead_scraper';
const KEEP_EMAIL = 'admin@test.com';

async function main() {
  await mongoose.connect(MONGODB_URI);
  const col = mongoose.connection.collection('users');

  const before = await col.countDocuments();
  const result = await col.deleteMany({ email: { $ne: KEEP_EMAIL } });
  const after = await col.countDocuments();

  console.log(`Before: ${before}, Deleted: ${result.deletedCount}, Remaining: ${after}`);

  const remaining = await col.find({}, { projection: { email: 1, name: 1, role: 1, _id: 0 } }).toArray();
  remaining.forEach(u => console.log(`  kept:`, u));

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
