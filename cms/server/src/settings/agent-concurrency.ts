/**
 * AI Agent 並行度設定。
 *
 * 每個 pipeline stage 有自己嘅 sub-worker（見 cms/worker/leader.ts），
 * 所以並行度係 per-stage 而唔係單一數字 —— S4（發信）刻意比 S2/S3 低。
 *
 * 存喺 settings collection 嘅 `agent_concurrency` key，value 形如
 * `{ S1: 3, S2: 3, S3: 3, S4: 2 }`。worker 會定期讀返嚟，
 * 唔使重啟 leader（見 cms/worker/agent.ts#refreshConcurrency）。
 */

export const AGENT_CONCURRENCY_KEY = 'agent_concurrency';

export const AGENT_STAGES = ['S1', 'S2', 'S3', 'S4'] as const;
export type AgentStage = (typeof AGENT_STAGES)[number];

/** 同 leader.ts 嘅 env 預設值一致 */
export const AGENT_CONCURRENCY_DEFAULT: Record<AgentStage, number> = {
  S1: 3,
  S2: 3,
  S3: 3,
  S4: 2,
};

export const AGENT_CONCURRENCY_MIN = 1;
export const AGENT_CONCURRENCY_MAX = 10;

/**
 * 收窄成合法值：整數、夾喺 1..10、丟掉未知 key、缺漏補預設。
 * 一個亂寫嘅值會令 worker 完全唔 claim task，所以呢層一定要有。
 */
export function sanitizeAgentConcurrency(value: unknown): Record<AgentStage, number> {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const out = { ...AGENT_CONCURRENCY_DEFAULT };

  for (const stage of AGENT_STAGES) {
    const n = Number(raw[stage]);
    if (!Number.isFinite(n)) continue;
    out[stage] = Math.min(
      AGENT_CONCURRENCY_MAX,
      Math.max(AGENT_CONCURRENCY_MIN, Math.round(n)),
    );
  }

  return out;
}
