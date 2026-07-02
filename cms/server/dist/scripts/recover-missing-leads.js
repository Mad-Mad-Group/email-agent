"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const dotenv_1 = require("dotenv");
const crypto_1 = require("crypto");
const normalize_company_1 = require("../src/common/utils/normalize-company");
(0, dotenv_1.config)();
const URI = process.env.MONGODB_URI;
if (!URI) {
    console.error('❌ MONGODB_URI 環境變數冇設 (請 source server/.env)');
    process.exit(1);
}
const ALL_MISSING = ['email', 'phone', 'address', 'website_description'];
function parseArgs() {
    const argv = process.argv.slice(2);
    const get = (key) => argv.find(a => a === `--${key}`);
    const has = (key) => argv.includes(`--${key}`);
    const dryRun = has('dry-run') || has('dry_run');
    const yes = has('yes') || has('y');
    const limit = Number(get('limit') ?? 0) || 0;
    const missingArg = get('missing');
    let missing = ALL_MISSING;
    if (missingArg && typeof missingArg === 'string') {
        const requested = missingArg
            .split(',')
            .map(s => s.trim().toLowerCase())
            .filter(Boolean);
        const valid = requested.filter((k) => ALL_MISSING.includes(k));
        if (valid.length === 0) {
            console.error(`❌ --missing 值無效: ${missingArg}; 請用逗號分隔 subset of ${ALL_MISSING.join('|')}`);
            process.exit(1);
        }
        missing = valid;
    }
    return { dryRun, missing, limit, yes };
}
function missingFields(lead, consider) {
    const out = [];
    for (const k of consider) {
        const v = lead[k];
        if (typeof v !== 'string' || v.trim() === '')
            out.push(k);
    }
    return out;
}
async function loadAllLeads(db) {
    const cursor = db
        .collection('leads')
        .find({ _deleted_at: null }, {
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
    });
    const out = [];
    for await (const d of cursor)
        out.push(d);
    return out;
}
async function hasActiveEnrichTask(db, leadId) {
    const cnt = await db.collection('tasks').countDocuments({
        skill_id: 'S2',
        'params.mode': 'enrich',
        'params.lead_id': leadId,
        status: { $in: ['pending', 'running'] },
    });
    return cnt > 0;
}
function clusterLeads(leads, missing) {
    const buckets = new Map();
    for (const l of leads) {
        const k = (0, normalize_company_1.normalizeCompanyName)(l.company_name);
        if (!k)
            continue;
        if (!buckets.has(k))
            buckets.set(k, []);
        buckets.get(k).push(l);
    }
    const clusters = [];
    for (const [key, items] of Array.from(buckets.entries())) {
        const sorted = [...items].sort((a, b) => {
            const ai = a._imported_at ?? '';
            const bi = b._imported_at ?? '';
            return bi.localeCompare(ai);
        });
        const canonical = sorted[0];
        const allMissing = new Set();
        for (const l of items)
            for (const m of missingFields(l, missing))
                allMissing.add(m);
        clusters.push({
            key,
            leads: items,
            canonical,
            missing: Array.from(allMissing),
        });
    }
    return clusters;
}
function fmt(n) {
    return n.toString().padStart(4, ' ');
}
function colour(s, code) {
    if (!process.stdout.isTTY)
        return s;
    return `\x1b[${code}m${s}\x1b[0m`;
}
const RED = (s) => colour(s, 31);
const YELLOW = (s) => colour(s, 33);
const GREEN = (s) => colour(s, 32);
const DIM = (s) => colour(s, 2);
async function main() {
    const args = parseArgs();
    const client = new mongodb_1.MongoClient(URI, { serverSelectionTimeoutMS: 5_000 });
    await client.connect();
    const db = client.db();
    console.log(DIM(`▸ Mongo: ${URI.replace(/:[^:@]+@/, ':***@')}`));
    console.log(DIM(`▸ Mode:  ${args.dryRun ? 'DRY-RUN (no enqueue)' : 'LIVE'}`));
    console.log(DIM(`▸ Check missing: ${args.missing.join(', ')}`));
    console.log(DIM(`▸ Limit: ${args.limit > 0 ? args.limit : '(all)'}`));
    console.log();
    const t0 = Date.now();
    const allLeads = await loadAllLeads(db);
    console.log(`Loaded ${allLeads.length} leads (excluding soft-deleted) in ${Date.now() - t0}ms`);
    const limited = args.limit > 0 ? allLeads.slice(0, args.limit) : allLeads;
    const clusters = clusterLeads(limited, args.missing);
    const dupClusters = clusters.filter(c => c.leads.length > 1);
    console.log(`Clustered into ${clusters.length} unique companies; ${dupClusters.length} have duplicates.`);
    if (dupClusters.length > 0) {
        console.log();
        console.log(YELLOW('重複 lead clusters:'));
        console.log(DIM('  occ | canonical                     | dup-ids (ObjectId prefix)        | missing'));
        for (const c of dupClusters) {
            const canonId = c.canonical._id.toString().slice(-8);
            const dupIds = c.leads
                .slice(1)
                .map(l => l._id.toString().slice(-8))
                .join(',');
            const missing = c.missing.length > 0 ? RED(c.missing.join('+')) : GREEN('none');
            console.log(`  ${fmt(c.leads.length)} | ${c.canonical.company_name.padEnd(28).slice(0, 28)} | ${(canonId + (dupIds ? ` (+${dupIds})` : '')).padEnd(28)} | ${missing}`);
        }
    }
    const result = {
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
        const taskId = `TASK-${(0, crypto_1.randomBytes)(4).toString('hex')}`;
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
    console.log();
    console.log('逐 cluster 結果:');
    console.log(DIM('   # | action   | missing           | company                          | task_id'));
    let i = 0;
    for (const a of result.actions) {
        i++;
        const tag = a.action === 'enqueue'
            ? GREEN('enqueue ')
            : a.missing && a.missing.length > 0
                ? YELLOW('skip    ')
                : DIM('skip    ');
        const m = (a.missing ?? []).join(',').padEnd(17).slice(0, 17) || '—';
        console.log(`  ${fmt(i)} | ${tag} | ${m} | ${a.company_name.padEnd(30).slice(0, 30)} | ${a.task_id ?? a.skipped_reason ?? ''}`);
    }
    console.log();
    console.log('──── Summary ────');
    console.log(`  total leads seen:       ${result.totalLeads}`);
    console.log(`  unique clusters:        ${result.clusterCount}`);
    console.log(`  duplicate clusters:     ${result.duplicateClusters}`);
    console.log(`  skipped (already rich): ${result.skipped - result.actions.filter(a => a.skipped_reason?.includes('task')).length}`);
    console.log(`  skipped (active task):  ${result.actions.filter(a => a.skipped_reason?.includes('task')).length}`);
    console.log(`  enqueued enrich tasks:  ${result.enqueued}${args.dryRun ? ' (dry-run; NOT inserted)' : ''}`);
    console.log(`  total time:             ${((Date.now() - t0) / 1000).toFixed(2)}s`);
    if (!args.dryRun) {
        await db.collection('recover_runs').insertOne({
            ...result,
            finished_at: new Date().toISOString(),
        });
        console.log(`  audit log:              recover_runs/${result.startedAt}`);
    }
    else {
        console.log(DIM('  audit log:              (dry-run — not written)'));
    }
    await client.close();
    process.exit(0);
}
main().catch(err => {
    console.error('❌ FATAL:', err);
    process.exit(1);
});
//# sourceMappingURL=recover-missing-leads.js.map