#!/usr/bin/env node
/**
 * ClientRadar CMS — MongoDB Seed Script
 *
 * 用途: 在新設備上初始化 MongoDB，建立所有 collections、indexes 和預設管理員帳號
 *
 * 用法:
 *   node scripts/seed-db.js                          # 使用預設 localhost
 *   MONGODB_URI=mongodb://... node scripts/seed-db.js # 指定連線
 *   node scripts/seed-db.js --admin-email=admin@test.com --admin-pass=123456
 *
 * DB 係 Atlas（雲端）嘅話，由本機直接指去目標 DB 就得，唔需要喺伺服器上行：
 *   node --env-file=cms/server/.env scripts/seed-db.js
 *
 * ⚠️ 此腳本是冪等的 — 重複執行不會刪除現有資料
 */

// repo root 冇 package.json / node_modules，所以 bare require 解析唔到。
// 依賴借用 cms/server 嘅（bcryptjs 本來已經咁做，mongodb 之前漏咗，
// 令 `node scripts/seed-db.js` 直接 MODULE_NOT_FOUND —— 而 setup.sh 用
// 2>/dev/null 蓋住咗，所以一直靜靜地失敗）。
function requireDep(name) {
  try {
    return require(name);
  } catch {
    try {
      return require(`../cms/server/node_modules/${name}`);
    } catch {
      console.error(`  ✘ 搵唔到 ${name}。請先: cd cms/server && npm install`);
      process.exit(1);
    }
  }
}

const { MongoClient } = requireDep('mongodb');
const crypto = require('crypto');

// ── 參數解析 ──────────────────────────────────────────
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [k, v] = arg.replace(/^--/, '').split('=');
  acc[k] = v || true;
  return acc;
}, {});

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lead_scraper';
const ADMIN_EMAIL = args['admin-email'] || 'admin@test.com';
const ADMIN_PASS = args['admin-pass'] || '123456';
const ADMIN_NAME = args['admin-name'] || 'Admin';

// ── 顏色輸出 ──────────────────────────────────────────
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const NC = '\x1b[0m';
const ok = (msg) => console.log(`  ${GREEN}✔${NC} ${msg}`);
const warn = (msg) => console.log(`  ${YELLOW}⚠${NC} ${msg}`);
const fail = (msg) => console.log(`  ${RED}✘${NC} ${msg}`);

// ── Collections 定義 ──────────────────────────────────
const COLLECTIONS = [
  {
    name: 'users',
    indexes: [
      { key: { email: 1 }, unique: true },
    ],
  },
  {
    name: 'leads',
    indexes: [
      { key: { lead_id: 1 } },
      { key: { user_id: 1 } },
      { key: { company_name: 1 } },
      { key: { email: 1 } },
      { key: { source: 1 } },
      { key: { status: 1 } },
      { key: { _status: 1 } },
      { key: { _deleted_at: 1 } },
      { key: { _deleted_at: 1, status: 1 } },
    ],
  },
  {
    name: 'notifications',
    indexes: [
      { key: { user_id: 1 } },
      { key: { type: 1 } },
      { key: { read: 1 } },
    ],
  },
  {
    name: 'calendar_events',
    indexes: [
      { key: { userId: 1 } },
      { key: { event_id: 1 } },
      { key: { type: 1 } },
      { key: { lead_id: 1 } },
    ],
  },
  {
    name: 'token_usages',
    indexes: [
      { key: { user_id: 1 } },
    ],
  },
  {
    name: 'campaigns',
    indexes: [
      { key: { campaign_id: 1 }, unique: true },
      { key: { user_id: 1 } },
      { key: { status: 1 } },
    ],
  },
  {
    name: 'verified_emails',
    indexes: [
      { key: { email: 1 } },
      { key: { company_name: 1 } },
      { key: { domain: 1 } },
      { key: { source_user_id: 1 } },
      { key: { email: 1, company_name: 1 }, unique: true },
    ],
  },
  {
    name: 'email_queue',
    indexes: [
      { key: { email_id: 1 } },
      { key: { lead_id: 1 } },
      { key: { user_id: 1 } },
      { key: { status: 1 } },
      { key: { status: 1, created_at: -1 } },
    ],
  },
  {
    name: 'analyses',
    indexes: [
      { key: { lead_id: 1 } },
    ],
  },
  {
    name: 'tasks',
    indexes: [
      { key: { task_id: 1 }, unique: true },
      { key: { skill_id: 1 } },
      { key: { status: 1 } },
      { key: { assigned_agent_id: 1 } },
      { key: { status: 1, skill_id: 1, _created_at: 1 } },
    ],
  },
  {
    name: 'settings',
    indexes: [
      { key: { key: 1 }, unique: true },
    ],
  },
  {
    name: 'roles',
    indexes: [
      { key: { name: 1 }, unique: true },
    ],
  },
  {
    name: 'user_credentials',
    indexes: [
      { key: { user_id: 1 }, unique: true },
    ],
  },
  {
    name: 'pipeline_schedules',
    indexes: [
      { key: { user_id: 1 } },
      { key: { enabled: 1 } },
      { key: { type: 1 } },
      { key: { next_run_at: 1 } },
      { key: { enabled: 1, next_run_at: 1 } },
    ],
  },
];

// ── 預設角色 ──────────────────────────────────────────
const DEFAULT_ROLES = [
  {
    name: 'admin',
    permissions: ['*'],
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    name: 'staff',
    permissions: [
      'leads:read', 'leads:write',
      'campaigns:read', 'campaigns:write',
      'calendar:read', 'calendar:write',
      'notifications:read',
    ],
    created_at: new Date(),
    updated_at: new Date(),
  },
];

// ── bcryptjs 簡易實現（避免依賴安裝問題）──────────────
// 使用 crypto 產生密碼 hash，與 bcryptjs 相容
async function hashPassword(password) {
  const bcrypt = requireDep('bcryptjs');
  return await bcrypt.hash(password, 10);
}

// ── 主程式 ────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('══════════════════════════════════════');
  console.log('  ClientRadar CMS — MongoDB Seed');
  console.log('══════════════════════════════════════');
  console.log('');
  console.log(`  連線: ${MONGODB_URI}`);
  console.log('');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    ok('MongoDB 連線成功');

    const db = client.db();
    const existingCollections = (await db.listCollections().toArray()).map(c => c.name);

    // ── 1. 建立 Collections + Indexes ──
    console.log('');
    console.log('▸ 建立 Collections 及 Indexes...');

    for (const col of COLLECTIONS) {
      // 建立 collection（如果不存在）
      if (!existingCollections.includes(col.name)) {
        await db.createCollection(col.name);
        ok(`建立 collection: ${col.name}`);
      } else {
        ok(`${col.name} 已存在`);
      }

      // 建立 indexes
      const collection = db.collection(col.name);
      for (const idx of col.indexes) {
        try {
          await collection.createIndex(idx.key, {
            unique: idx.unique || false,
            background: true,
          });
        } catch (e) {
          // 索引已存在或衝突 — 不影響其他操作
          if (e.code !== 85 && e.code !== 86) {
            warn(`${col.name} index ${JSON.stringify(idx.key)}: ${e.message}`);
          }
        }
      }
    }

    // ── 2. 插入預設角色 ──
    console.log('');
    console.log('▸ 建立預設角色...');

    const rolesCol = db.collection('roles');
    for (const role of DEFAULT_ROLES) {
      const exists = await rolesCol.findOne({ name: role.name });
      if (!exists) {
        await rolesCol.insertOne(role);
        ok(`建立角色: ${role.name}`);
      } else {
        ok(`角色 ${role.name} 已存在`);
      }
    }

    // ── 3. 建立管理員帳號 ──
    console.log('');
    console.log('▸ 建立管理員帳號...');

    const usersCol = db.collection('users');
    const adminExists = await usersCol.findOne({ email: ADMIN_EMAIL });
    if (!adminExists) {
      const hashedPass = await hashPassword(ADMIN_PASS);
      await usersCol.insertOne({
        email: ADMIN_EMAIL,
        password: hashedPass,
        name: ADMIN_NAME,
        role: 'admin',
        permissions: [],
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        notification_prefs: {
          email_on_complete: false,
          browser_on_complete: false,
          notification_email: '',
        },
        resetToken: null,
        resetTokenExpiry: null,
        companyName: '',
        companyDescription: '',
        companyWebsite: '',
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPass: '',
        smtpFrom: '',
        imapHost: '',
        imapPort: 993,
        whatsappTemplates: [],
      });
      ok(`建立管理員: ${ADMIN_EMAIL} / ${ADMIN_PASS}`);
    } else {
      ok(`管理員 ${ADMIN_EMAIL} 已存在`);
    }

    // ── 4. 驗證 ──
    console.log('');
    console.log('▸ 驗證...');

    const finalCollections = (await db.listCollections().toArray()).map(c => c.name);
    const missing = COLLECTIONS.filter(c => !finalCollections.includes(c.name));
    if (missing.length === 0) {
      ok(`全部 ${COLLECTIONS.length} 個 collections 已就緒`);
    } else {
      fail(`缺少 collections: ${missing.map(c => c.name).join(', ')}`);
    }

    // 統計 indexes
    let totalIndexes = 0;
    for (const col of COLLECTIONS) {
      const indexes = await db.collection(col.name).indexes();
      totalIndexes += indexes.length - 1; // 扣除 _id 索引
    }
    ok(`共 ${totalIndexes} 個自訂索引`);

    console.log('');
    console.log('══════════════════════════════════════');
    console.log('  Seed 完成！');
    console.log('══════════════════════════════════════');
    console.log('');
    console.log(`  管理員帳號: ${ADMIN_EMAIL}`);
    console.log(`  管理員密碼: ${ADMIN_PASS}`);
    console.log('');
    console.log('  下一步:');
    console.log('    1. 啟動 Backend:  cd cms/server && npm run start:dev');
    console.log('    2. 啟動 Frontend: cd hermes-frontend && npm run dev');
    console.log('    3. 用管理員帳號登入 http://localhost:5173');
    console.log('');

  } catch (err) {
    fail(`Seed 失敗: ${err.message}`);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
