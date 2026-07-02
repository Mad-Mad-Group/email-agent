/**
 * Seed mock email_queue 数据 — 给本地开发用。
 * 用法：cd cms/server && npx ts-node scripts/seed-email-queue.ts
 */
import { MongoClient } from 'mongodb';
import { randomBytes } from 'crypto';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/email-agent';
const DB_NAME = 'email-agent';
const COLLECTION = 'email_queue';

const COMPANIES = [
  { name: 'Pure Yoga (Asia Standard Tower)',  email: 'hello@pure-360.com.hk',  industry: '健身' },
  { name: 'GreenLeaf Biotech',                 email: 'contact@greenleaf.bio',  industry: '生物科技' },
  { name: 'QuantumEdge Finance',               email: 'biz@quantumedge.com',    industry: '金融科技' },
  { name: 'CloudNine Solutions',               email: 'info@cloudnine.io',      industry: '云服务' },
  { name: 'TechVision AI',                      email: 'hello@techvision.ai',    industry: 'AI SaaS' },
  { name: 'Helix Health Group',                 email: 'partners@helixhealth.co',industry: '医疗' },
  { name: 'NovaTech Manufacturing',             email: 'sales@novatech-mfg.com', industry: '制造业' },
  { name: 'Aurora Logistics',                   email: 'ops@aurora-logi.com',    industry: '物流' },
  { name: 'Crystal Hospitality Group',          email: 'gm@crystalhotels.com',   industry: '酒店' },
  { name: 'Bayside Education Centre',           email: 'admin@bayside-edu.hk',   industry: '教育' },
  { name: 'Mosaic Creative Studio',             email: 'hello@mosaicstudio.io',  industry: '设计' },
  { name: 'Northwind Retail Group',             email: 'crm@northwind-retail.com',industry: '零售' },
  { name: 'Sterling Legal Partners',            email: 'intake@sterlinglegal.com',industry: '法律' },
  { name: 'Vertex Robotics',                    email: 'bizdev@vertexrobotics.ai',industry: '机器人' },
  { name: 'Cascade Insurance Co',               email: 'agents@cascade-ins.com',  industry: '保险' },
  { name: 'Brightway Real Estate',             email: 'leads@brightway-re.com', industry: '房地产' },
  { name: 'Helios Energy Solutions',            email: 'contact@helios-energy.io',industry: '能源' },
  { name: 'Polaris Maritime',                   email: 'ops@polarismaritime.com', industry: '航运' },
  { name: 'Verdant Organic Foods',              email: 'wholesale@verdantfoods.co',industry: '食品' },
  { name: 'QuantumLeap AI Research',            email: 'research@qleap.ai',      industry: 'AI 研究' },
];

const STATUSES = ['pending', 'approved', 'rejected', 'sent', 'failed'] as const;
const STATUS_WEIGHTS = [0.35, 0.20, 0.10, 0.25, 0.10]; // 真实业务分布

const SUBJECT_TEMPLATES = [
  '关于 {company} 与我们合作的方案',
  'Quick intro + partnership opportunity for {industry}',
  '{industry} 行业客户拓展 - {company}',
  'Re: Following up on our conversation',
  'Request for demo: CRM automation for {industry}',
  '{company} - 产品体验邀请',
  '合作提案：{company} 与我们的集成方案',
  'Fwd: 介绍 - {industry} 解决方案',
];

const BODY_TEMPLATES = [
  `Hi {name} 团队，

我是 Hermes CRM 的 outreach 顾问。我们专门为 {industry} 行业提供 lead 自动化方案。

注意到 {company} 最近在拓展客户群，了解到你们可能正在寻找更高效的 outreach 工具。我们已经帮助 200+ 类似公司实现 3-5x 的转化率提升。

想约一个 15 分钟的 call，演示下我们的产品怎么帮到你们。

Best,
Hermes Outreach Team`,

  `Hi {name}，

Following up on my previous email. I wanted to share a quick case study — we helped a similar {industry} company increase qualified leads by 280% in 3 months.

Would love to walk you through it. Free 15-min demo this week?

Thanks,
Hermes`,
];

const REJECT_REASONS = [
  '公司规模不符合目标客户画像（ICP）',
  '客户已与竞争对手签约',
  '邮件地址无效 / 域名不存在',
  '联系人已离职',
  '行业监管限制',
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickWeighted<T>(arr: readonly T[], weights: number[]): T {
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < arr.length; i++) {
    cum += weights[i];
    if (r < cum) return arr[i];
  }
  return arr[arr.length - 1];
}
function nowStr(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
function randId(): string {
  return randomBytes(4).toString('hex');
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  console.log(`✅ Connected to ${MONGO_URI}`);

  const db = client.db(DB_NAME);
  const col = db.collection(COLLECTION);

  // 清空旧数据
  const del = await col.deleteMany({});
  console.log(`🗑️  Deleted ${del.deletedCount} old emails`);

  // 生成 20 封邮件（按真实业务分布 5 个 status）
  const docs = COMPANIES.map((c, i) => {
    const status = pickWeighted(STATUSES, STATUS_WEIGHTS);
    const subject = pick(SUBJECT_TEMPLATES)
      .replace('{company}', c.name)
      .replace('{industry}', c.industry);
    const body = pick(BODY_TEMPLATES)
      .replace(/{name}/g, c.name)
      .replace(/{company}/g, c.name)
      .replace(/{industry}/g, c.industry);
    const createdDaysAgo = Math.floor(Math.random() * 14);
    const created_at = nowStr(createdDaysAgo);
    const sent_at = status === 'sent' ? nowStr(Math.max(0, createdDaysAgo - 1)) : undefined;

    return {
      email_id: randId(),
      lead_id: `LEAD-${randId()}`,
      user_id: 'admin-user',
      company_name: c.name,
      to_email: c.email,
      subject,
      body,
      status,
      created_at,
      sent_at,
      error: status === 'failed' ? { rejected_reason: pick(REJECT_REASONS) } :
             status === 'rejected' ? { rejected_reason: pick(REJECT_REASONS) } : null,
    };
  });

  const result = await col.insertMany(docs);
  console.log(`📧 Inserted ${result.insertedCount} emails`);

  // 按 status 统计
  for (const s of STATUSES) {
    const n = await col.countDocuments({ status: s });
    console.log(`   ${s.padEnd(10)} : ${n}`);
  }
  console.log(`\n✅ Done! 刷新 http://localhost:5173/cms-email-queue 看效果`);

  await client.close();
}

main().catch(err => {
  console.error('❌', err);
  process.exit(1);
});
