/**
 * Leader Worker — 主進程，fork 4 個 stage sub-worker。
 *
 * 每個 sub-worker 係一個獨立嘅 agent.ts 進程，用 AGENT_SKILL env 控制只處理自己 stage 嘅 task。
 * Leader 負責：啟動 / 監控 / crash 自動重啟 / graceful shutdown。
 *
 * 架構：
 *   leader (本檔案)
 *     ├── sub-worker S1  (search)        concurrency=1
 *     ├── sub-worker S2  (enrich+analyze) concurrency=3
 *     ├── sub-worker S3  (draft)          concurrency=3
 *     └── sub-worker S4  (send)           concurrency=2
 *
 * 用法：
 *   npm run leader          （生產）
 *   node --env-file=.env dist/leader.js
 */
import { fork, ChildProcess } from 'child_process';
import { resolve } from 'path';

const log = (...a: unknown[]) => console.log(`[leader]`, ...a);

interface SubWorkerDef {
  /** 顯示名 */
  name: string;
  /** AGENT_SKILL — 只 claim 呢個 skill_id */
  skill: string;
  /** 每個 sub-worker 嘅 concurrency */
  concurrency: number;
}

/** 4 個 pipeline stage 對應嘅 sub-worker 定義 */
const WORKERS: SubWorkerDef[] = [
  { name: 'search',  skill: 'S1', concurrency: Number(process.env.S1_CONCURRENCY || 3) },
  { name: 'analyze', skill: 'S2', concurrency: Number(process.env.S2_CONCURRENCY || 3) },
  { name: 'draft',   skill: 'S3', concurrency: Number(process.env.S3_CONCURRENCY || 3) },
  { name: 'send',    skill: 'S4', concurrency: Number(process.env.S4_CONCURRENCY || 2) },
];

/** 重啟延遲（ms），避免 crash loop */
const RESTART_DELAY = Number(process.env.RESTART_DELAY || 3000);

/** agent.ts 編譯後嘅路徑 */
const AGENT_SCRIPT = resolve(__dirname, 'agent.js');

interface RunningWorker {
  def: SubWorkerDef;
  proc: ChildProcess;
  restarts: number;
}

const running: RunningWorker[] = [];
let shuttingDown = false;

function spawnWorker(def: SubWorkerDef, restarts = 0): RunningWorker {
  const agentId = `WORKER-${def.name.toUpperCase()}`;
  log(`啟動 sub-worker [${def.name}] skill=${def.skill} concurrency=${def.concurrency} agent_id=${agentId}`);

  const proc = fork(AGENT_SCRIPT, [], {
    env: {
      ...process.env,
      AGENT_SKILL: def.skill,
      AGENT_ID: agentId,
      CONCURRENCY: String(def.concurrency),
      // 繼承 leader 嘅 env（API_URL, MONGODB_URI, AGENT_EMAIL, AGENT_PASS 等）
    },
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  });

  const entry: RunningWorker = { def, proc, restarts };

  proc.on('exit', (code, signal) => {
    if (shuttingDown) {
      log(`sub-worker [${def.name}] 已停止 (code=${code})`);
      return;
    }
    log(`⚠ sub-worker [${def.name}] 意外退出 (code=${code} signal=${signal})，${RESTART_DELAY}ms 後重啟…`);
    // 從 running 移除
    const idx = running.indexOf(entry);
    if (idx !== -1) running.splice(idx, 1);
    // 延遲重啟
    setTimeout(() => {
      if (!shuttingDown) {
        running.push(spawnWorker(def, restarts + 1));
      }
    }, RESTART_DELAY);
  });

  return entry;
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  log(`收到停止訊號，通知 ${running.length} 個 sub-worker 停止…`);
  for (const w of running) {
    w.proc.kill('SIGINT');
  }
  // 等 sub-workers 退出（最多 30 秒）
  const deadline = Date.now() + 30_000;
  const check = () => {
    const alive = running.filter(w => !w.proc.killed && w.proc.exitCode === null);
    if (alive.length === 0 || Date.now() > deadline) {
      if (alive.length > 0) {
        log(`${alive.length} 個 sub-worker 仍未停止，強制 kill`);
        alive.forEach(w => w.proc.kill('SIGKILL'));
      }
      log('Leader 已停止');
      process.exit(0);
    }
    setTimeout(check, 500);
  };
  check();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ── 啟動 ──
log(`啟動 Leader — ${WORKERS.length} 個 sub-worker`);
log(`  S1(search)=${WORKERS[0].concurrency}  S2(analyze)=${WORKERS[1].concurrency}  S3(draft)=${WORKERS[2].concurrency}  S4(send)=${WORKERS[3].concurrency}`);

for (const def of WORKERS) {
  running.push(spawnWorker(def));
}

log('所有 sub-worker 已啟動，Leader 進入監控模式');
