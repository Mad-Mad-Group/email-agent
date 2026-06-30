/** Task 狀態（對應 DB `tasks.status`）。Hermes agent claim 後轉 running，做完 completed。 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
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
