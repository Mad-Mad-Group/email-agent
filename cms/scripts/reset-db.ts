#!/usr/bin/env npx ts-node
/**
 * reset-db.ts — 清空 leads / campaigns / tasks，寫入 mock data 供開發測試。
 *
 * 用法：
 *   cd cms && npx ts-node scripts/reset-db.ts
 *
 * ⚠️ 只適合開發環境，唔好喺 production 跑！
 */
import { MongoClient } from 'mongoose/node_modules/mongodb';
import { randomBytes } from 'crypto';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lead_scraper';

function nowIso() { return new Date().toISOString().replace('T', ' ').slice(0, 19); }
function taskId() { return `TASK-${randomBytes(4).toString('hex')}`; }
function campaignId() { return `CAMP-${randomBytes(4).toString('hex')}`; }
function leadId() { return randomBytes(8).toString('hex'); }

const MOCK_LEADS = [
  {
    lead_id: leadId(),
    company_name: '測試學校 A',
    email: 'info@school-a.edu.hk',
    phone: '(852) 2345 6789',
    website: 'https://www.school-a.edu.hk',
    address: '香港灣仔軒尼詩道 100 號',
    source: 'google_maps',
    search_query: '中學 香港',
    status: null,
    _status: 'unverified',
    _via: 'hermes',
    _imported_at: nowIso(),
    _deleted_at: null,
  },
  {
    lead_id: leadId(),
    company_name: '測試補習社 B',
    email: 'contact@tutor-b.com.hk',
    phone: '(852) 9876 5432',
    website: 'https://www.tutor-b.com.hk',
    address: '九龍旺角彌敦道 200 號',
    source: 'google_maps',
    search_query: '補習社 九龍',
    status: 'pending',
    _status: 'unverified',
    _via: 'hermes',
    _imported_at: nowIso(),
    _deleted_at: null,
  },
  {
    lead_id: leadId(),
    company_name: '測試幼稚園 C',
    email: 'admin@kinder-c.edu.hk',
    phone: '(852) 5555 1234',
    website: 'https://www.kinder-c.edu.hk',
    address: '新界沙田大圍道 50 號',
    source: 'google_maps',
    search_query: '幼稚園 新界',
    status: 'contacted',
    _status: 'unverified',
    _via: 'hermes',
    _email_sent: true,
    _email_sent_at: nowIso(),
    _imported_at: nowIso(),
    _deleted_at: null,
  },
  {
    lead_id: leadId(),
    company_name: '測試培訓中心 D',
    email: 'hello@training-d.hk',
    phone: '(852) 6666 7788',
    website: 'https://www.training-d.hk',
    address: '香港中環皇后大道中 300 號',
    source: 'google_maps',
    search_query: '培訓中心 香港',
    status: null,
    _status: 'unverified',
    _via: 'hermes',
    _imported_at: nowIso(),
    _deleted_at: null,
  },
  {
    lead_id: leadId(),
    company_name: '測試語言學校 E',
    email: 'info@lang-e.com.hk',
    phone: '(852) 3333 4444',
    website: 'https://www.lang-e.com.hk',
    address: '九龍尖沙咀廣東道 88 號',
    source: 'google_maps',
    search_query: '語言學校 九龍',
    status: null,
    _status: 'unverified',
    _via: 'hermes',
    _imported_at: nowIso(),
    _deleted_at: null,
  },
];

async function main() {
  console.log(`🔗 連接 ${MONGODB_URI} …`);
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  // ── 清空 ──
  const collections = ['leads', 'campaigns', 'tasks'];
  for (const name of collections) {
    const { deletedCount } = await db.collection(name).deleteMany({});
    console.log(`🗑  清空 ${name}：刪除 ${deletedCount} 筆`);
  }

  // ── 寫入 mock leads ──
  const leadResult = await db.collection('leads').insertMany(MOCK_LEADS);
  const insertedIds = Object.values(leadResult.insertedIds).map((id: any) => id.toString());
  console.log(`✅ 寫入 ${insertedIds.length} 筆 mock leads`);

  // ── 寫入 mock campaign（包含頭 3 個 lead）──
  const campId = campaignId();
  await db.collection('campaigns').insertOne({
    campaign_id: campId,
    keyword: '中學',
    location: '香港',
    target_count: 3,
    status: 'completed',
    pipeline_stage: 'fanout',
    lead_ids: insertedIds.slice(0, 3),
    done_count: 3,
    _created_at: nowIso(),
    _updated_at: nowIso(),
  });
  console.log(`✅ 寫入 1 筆 mock campaign: ${campId}`);

  // ── 寫入 mock tasks（對應 campaign 嘅 search + 3 個 lead 嘅 enrich）──
  const mockTasks = [
    {
      task_id: taskId(),
      title: `[${campId}] search`,
      skill_id: 'S1',
      params: { keyword: '中學', location: '香港', target_count: 3, campaign_id: campId },
      priority: 'normal',
      status: 'completed',
      assigned_agent_id: 'WORKER-1',
      created_by: 'system',
      result: { created_leads: 3, lead_object_ids: insertedIds.slice(0, 3), skipped: 0 },
      error: null,
      _created_at: nowIso(),
      _updated_at: nowIso(),
    },
    ...insertedIds.slice(0, 3).map(lid => ({
      task_id: taskId(),
      title: `[${campId}] enrich`,
      skill_id: 'S2',
      params: { lead_id: lid, campaign_id: campId },
      priority: 'normal',
      status: 'completed',
      assigned_agent_id: 'WORKER-1',
      created_by: 'system',
      result: { enriched: true },
      error: null,
      _created_at: nowIso(),
      _updated_at: nowIso(),
    })),
  ];
  await db.collection('tasks').insertMany(mockTasks);
  console.log(`✅ 寫入 ${mockTasks.length} 筆 mock tasks`);

  // ── 完成 ──
  await client.close();
  console.log('\n🎉 Reset 完成！mock data 已就緒。');
}

main().catch(err => {
  console.error('❌ Reset 失敗:', err);
  process.exit(1);
});
