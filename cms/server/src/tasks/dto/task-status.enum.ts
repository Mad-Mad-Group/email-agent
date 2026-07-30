/** Task 狀態（對應 DB `tasks.status`）。Hermes agent claim 後轉 running，做完 completed。 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  /**
   * 用戶主動取消。刻意同 failed 分開：
   * failed 會被 orchestrator 當「跳過呢個 lead 繼續 pipeline」處理，
   * 而 cancelled 係整條 pipeline 都唔要再做。
   * 亦令 reap-stalled-tasks 唔會復活佢（佢只掃 running）。
   */
  CANCELLED = 'cancelled',
}

/**
 * Skill ID 對應（由 agent_registry 真實資料）：
 *   S1 搵客源(情報收集) ｜ S2 深度分析客戶 ｜ S3 生成 Outreach Email ｜ S4 發送+回覆+跟進
 */
export const SKILL = {
  SEARCH: 'S1',
  ANALYZE: 'S2',
  EMAIL_DRAFT: 'S3',
  EMAIL_SEND: 'S4',
} as const;

export type SkillId = (typeof SKILL)[keyof typeof SKILL];
