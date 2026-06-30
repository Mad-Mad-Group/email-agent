/**
 * Leads Recovery CLI — 對比 DB 補齊缺失資料。
 *
 * 流程：
 *   1. 讀取全量 leads (Mongo 直連, 唔經 NestJS / JWT)
 *   2. 依 company_name normalize 做 dedupe（撞名歸類）
 *   3. 對每組 dedupe cluster：
 *      - 檢查 email / phone / address / website_description 是否齊備
 *      - 任一空 → enqueue 一個 S2 enrich task
 *      - 全部齊 → skip
 *   4. 寫 audit log 入 recover_runs collection
 *
 * 用法：
 *   npm run leads:recover
 *   npm run leads:recover -- --dry-run
 *   npm run leads:recover -- --missing email,phone
 *   npm run leads:recover -- --limit 50
 *   npm run leads:recover -- --yes     # 跳過確認
 *
 * 環境：
 *   MONGODB_URI  必填 (server .env 已有 default)
 *
 * 注意：
 *   - 必須 worker 處於 idle 狀態，否則 task 入到 queue 會被舊 worker 領走。
 *     建議停咗 worker 先 run，run 完再 npm run worker。
 *   - 重複 enqueue 同一 lead 嘅 task 會喺 task queue 堆積；
 *     為避免，我哋 detech 同 lead 入面 pending|running 嘅 enrich task 已存在就 skip。
 */
import { MongoClient, ObjectId } from 'mongodb';
import { config as loadEnv } from 'dotenv';
import { randomBytes } from 'crypto';
import { normalizeCompanyName } from '../src/common/utils/normalize-company';

loadEnv();

const URI = process.env.MONGODB_URI;
if (!URI) {
  console.error('❌ MONGODB_URI 環境變數冇設 (請 source server/.env)');
  process.exit(1);
}

type MissingKind = 'email' | 'phone' | 'address' | 'website_description';
const ALL_MISSING: MissingKind[] = ['email', 'phone', 'address', 'website_description'];

interface LeadDoc {
  _id: ObjectId;
  lead_id?: string;
  company_name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  website_description?: string;
  _status?: string;
  _deleted_at?: string | null;
  [k: string]: any;
}

interface CliArgs {
  dryRun: boolean;
  missing: MissingKind[];
  limit: number;
  yes: boolean;
}

function parseArgs(): CliArgs {
  const argv = process.argv.slice(2);
  const get = (key: string) => argv.find(a => a === `--${key}`);
  const has = (key: string) => argv.includes(`--${key}`);
  const dryRun = has('dry-run') || has('dry_run');
  const yes = has('yes') || has('y');
  const limit = Number(get('limit') ?? 0) || 0;

  const missingArg = get('missing');
  let missing: MissingKind[] = ALL_MISSING;
  if (missingArg && typeof missingArg === 'string') {
    const requested = missingArg
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    const valid = requested.filter((k): k is MissingKind =>
      (ALL_MISSING as string[]).includes(k),
    );
    if (valid.length === 0) {
      console.error(
        `❌ --missing 值無效: ${missingArg}; 請用逗號分隔 subset of ${ALL_MISSING.join('|')}`,
      );
      process.exit(1);
    }
    missing = valid;
  }

  return { dryRun, missing, limit, yes };
}

/** 判斷 lead 缺咩資料 (依傳入 --missing 過濾) */
function missingFields(lead: LeadDoc, consider: MissingKind[]): MissingKind[] {
  const out: MissingKind[] = [];
  for (const k of consider) {
    const v = lead[k];
    if (typeof v !== 'string' || v.trim() === '') out.push(k);
  }
  return out;
}

async function loadAllLeads(db: any): Promise<LeadDoc[]> {
  const cursor = db
    .collection('leads')
    .find(
      { _deleted_at: null },
      {
        projection: {
          _id: 1,
          lead_id: 1,
          company_name: 1,
          email: 1,
          phone: 1,
          address: 1,
          website: 1,
          website_description: 1,
          _status: 1,
          _deleted_at: 1,
        },
      },
    );
  const out: LeadDoc[] = [];
  for await (const d of cursor) out.push(d);
  return out;
}

/** Detect 同一 cluster 入面是否已經有 pending/running enrich task。 */
async function hasActiveEnrichTask(
  db: any,
  leadId: string,
): Promise<boolean> {
  const cnt = await db.collection('tasks').countDocuments({
    skill_id: 'S2',
    'params.mode': 'enrich',
    'params.lead_id': leadId,
    status: { $in: ['pending', 'running'] },
  });
  return cnt > 0;
}

interface DedupCluster {
  key: string;
  leads: LeadDoc[];
  /** "canonical" lead — 用 _imported_at 最新 (worker 寫嗰陣已 set) */
  canonical: LeadDoc;
  missing: MissingKind[];
}

function clusterLeads(leads: LeadDoc[], missing: MissingKind[]): DedupCluster[] {
  const buckets = new Map<string, LeadDoc[]>();
  for (const l of leads) {
    const k = normalizeCompanyName(l.company_name);
    if (!k) continue;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(l);
  }
  const clusters: DedupCluster[] = [];
  for (const [key, items] of Array.from(buckets.entries())) {
    // 揀 _imported_at 最新嘅做 canonical (其實邊個都得, 主要用其 _id)
    const sorted = [...items].sort((a, b) => {
      const ai = (a as any)._imported_at ?? '';
      const bi = (b as any)._imported_at ?? '';
      return bi.localeCompare(ai);
    });
    const canonical = sorted[0];
    const allMissing = new Set<MissingKind>();
    for (const l of items) for (const m of missingFields(l, missing)) allMissing.add(m);
    clusters.push({
      key,
      leads: items,
      canonical,
      missing: Array.from(allMissing),
    });
  }
  return clusters;
}

function fmt(n: number) {
  return n.toString().padStart(4, ' ');
}
function colour(s: string, code: number) {
  if (!process.stdout.isTTY) return s;
  return `\x1b[${code}m${s}\x1b[0m`;
}
const RED = (s: string) => colour(s, 31);
const YELLOW = (s: string) => colour(s, 33);
const GREEN = (s: string) => colour(s, 32);
const DIM = (s: string) => colour(s, 2);

interface RunResult {
  startedAt: string;
  dryRun: boolean;
  missing: MissingKind[];
  totalLeads: number;
  clusterCount: number;
  duplicateClusters: number;
  skipped: number;
  enqueued: number;
  taskIds: string[];
  actions: Array<{
    cluster_key: string;
    company_name: string;
    lead_id: string;
    action: 'skip' | 'enqueue';
    missing?: MissingKind[];
    task_id?: string;
    skipped_reason?: string;
  }>;
}

async function main() {
  const args = parseArgs();
  const client = new MongoClient(URI!, { serverSelectionTimeoutMS: 5_000 });
  await client.connect();
  const db = client.db();

  console.log(DIM(`▸ Mongo: ${URI!.replace(/:[^:@]+@/, ':***@')}`));
  console.log(DIM(`▸ Mode:  ${args.dryRun ? 'DRY-RUN (no enqueue)' : 'LIVE'}`));
  console.log(DIM(`▸ Check missing: ${args.missing.join(', ')}`));
  console.log(DIM(`▸ Limit: ${args.limit > 0 ? args.limit : '(all)'}`));
  console.log();

  const t0 = Date.now();
  const allLeads = await loadAllLeads(db);
  console.log(
    `Loaded ${allLeads.length} leads (excluding soft-deleted) in ${
      Date.now() - t0
    }ms`,
  );

  const limited = args.limit > 0 ? allLeads.slice(0, args.limit) : allLeads;
  const clusters = clusterLeads(limited, args.missing);
  const dupClusters = clusters.filter(c => c.leads.length > 1);
  console.log(
    `Clustered into ${clusters.length} unique companies; ${dupClusters.length} have duplicates.`,
  );

  // ══════ Print duplicates summary table ══════
  if (dupClusters.length > 0) {
    console.log();
    console.log(YELLOW('重複 lead clusters:'));
    console.log(
      DIM(
        '  occ | canonical                     | dup-ids (ObjectId prefix)        | missing',
      ),
    );
    for (const c of dupClusters) {
      const canonId = c.canonical._id.toString().slice(-8);
      const dupIds = c.leads
        .slice(1)
        .map(l => l._id.toString().slice(-8))
        .join(',');
      const missing = c.missing.length > 0 ? RED(c.missing.join('+')) : GREEN('none');
      console.log(
        `  ${fmt(c.leads.length)} | ${c.canonical.company_name.padEnd(28).slice(0, 28)} | ${(canonId + (dupIds ? ` (+${dupIds})` : '')).padEnd(28)} | ${missing}`,
      );
    }
  }

  // ══════ Decide per cluster ══════
  const result: RunResult = {
    startedAt: new Date().toISOString(),
    dryRun: args.dryRun,
    missing: args.missing,
    totalLeads: limited.length,
    clusterCount: clusters.length,
    duplicateClusters: dupClusters.length,
    skipped: 0,
    enqueued: 0,
    taskIds: [],
    actions: [],
  };

  for (const c of clusters) {
    if (c.missing.length === 0) {
      result.skipped++;
      result.actions.push({
        cluster_key: c.key,
        company_name: c.canonical.company_name,
        lead_id: c.canonical.lead_id ?? c.canonical._id.toString(),
        action: 'skip',
        skipped_reason: '已齊資料',
      });
      continue;
    }

    // 有缺失：先檢查會唔會已經有 pending/running enrich task (避免堆積)
    const leadId = c.canonical.lead_id ?? c.canonical._id.toString();
    const hasActive = await hasActiveEnrichTask(db, leadId);
    if (hasActive) {
      result.skipped++;
      result.actions.push({
        cluster_key: c.key,
        company_name: c.canonical.company_name,
        lead_id: leadId,
        action: 'skip',
        missing: c.missing,
        skipped_reason: '已 pending|running enrich task',
      });
      continue;
    }

    // Enqueue
    const taskId = `TASK-${randomBytes(4).toString('hex')}`;
    if (!args.dryRun) {
      await db.collection('tasks').insertOne({
        task_id: taskId,
        skill_id: 'S2',
        title: `Recover: ${c.canonical.company_name}`,
        params: {
          mode: 'enrich',
          lead_id: leadId,
          lead_object_id: c.canonical._id.toString(),
          website: c.canonical.website,
          missing: c.missing,
          source: 'leads_recover',
          run_id: result.startedAt,
        },
        priority: 'normal',
        status: 'pending',
        created_by: 'leads-recover-cli',
        _created_at: new Date().toISOString(),
        _updated_at: new Date().toISOString(),
      });
    }

    result.enqueued++;
    result.taskIds.push(taskId);
    result.actions.push({
      cluster_key: c.key,
      company_name: c.canonical.company_name,
      lead_id: leadId,
      action: 'enqueue',
      missing: c.missing,
      task_id: taskId,
    });
  }

  // ══════ Print per-cluster action ══════
  console.log();
  console.log('逐 cluster 結果:');
  console.log(
    DIM(
      '   # | action   | missing           | company                          | task_id',
    ),
  );
  let i = 0;
  for (const a of result.actions) {
    i++;
    const tag =
      a.action === 'enqueue'
        ? GREEN('enqueue ')
        : a.missing && a.missing.length > 0
        ? YELLOW('skip    ')
        : DIM('skip    ');
    const m = (a.missing ?? []).join(',').padEnd(17).slice(0, 17) || '—';
    console.log(
      `  ${fmt(i)} | ${tag} | ${m} | ${a.company_name.padEnd(30).slice(0, 30)} | ${
        a.task_id ?? a.skipped_reason ?? ''
      }`,
    );
  }

  // ══════ Summary ══════
  console.log();
  console.log('──── Summary ────');
  console.log(`  total leads seen:       ${result.totalLeads}`);
  console.log(`  unique clusters:        ${result.clusterCount}`);
  console.log(`  duplicate clusters:     ${result.duplicateClusters}`);
  console.log(`  skipped (already rich): ${result.skipped - result.actions.filter(a => a.skipped_reason?.includes('task')).length}`);
  console.log(`  skipped (active task):  ${result.actions.filter(a => a.skipped_reason?.includes('task')).length}`);
  console.log(`  enqueued enrich tasks:  ${result.enqueued}${args.dryRun ? ' (dry-run; NOT inserted)' : ''}`);
  console.log(`  total time:             ${((Date.now() - t0) / 1000).toFixed(2)}s`);

  // ══════ Audit log ══════
  if (!args.dryRun) {
    await db.collection('recover_runs').insertOne({
      ...result,
      finished_at: new Date().toISOString(),
    });
    console.log(`  audit log:              recover_runs/${result.startedAt}`);
  } else {
    console.log(DIM('  audit log:              (dry-run — not written)'));
  }

  await client.close();

  // Exit code: 1 if dry-run (just inform), 0 if live and we did something or nothing
  process.exit(0);
}

main().catch(err => {
  console.error('❌ FATAL:', err);
  process.exit(1);
});
