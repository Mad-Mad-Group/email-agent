"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lead_scraper';
const KEEP_EMAIL = 'admin@test.com';
async function main() {
    await mongoose_1.default.connect(MONGODB_URI);
    const col = mongoose_1.default.connection.collection('users');
    const before = await col.countDocuments();
    const result = await col.deleteMany({ email: { $ne: KEEP_EMAIL } });
    const after = await col.countDocuments();
    console.log(`Before: ${before}, Deleted: ${result.deletedCount}, Remaining: ${after}`);
    const remaining = await col.find({}, { projection: { email: 1, name: 1, role: 1, _id: 0 } }).toArray();
    remaining.forEach(u => console.log(`  kept:`, u));
    await mongoose_1.default.disconnect();
}
main().catch(err => { console.error(err); process.exit(1); });
//# sourceMappingURL=cleanup-users.js.map