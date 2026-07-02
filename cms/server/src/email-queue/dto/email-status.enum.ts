/**
 * Email queue 狀態機（對應 DB `email_queue.status`）。
 * ⚠️ 真實數據現有：`pending` / `sent`。`approved` / `rejected` / `failed` 係
 *    本 module 新增嘅審批流狀態（additive，Python 唔識嘅當 pending 處理）。
 */
export enum EmailStatus {
  PENDING = 'pending', // 等審批
  APPROVED = 'approved', // 已審批，等發送
  REJECTED = 'rejected', // 拒絕
  SENT = 'sent', // 已發送
  FAILED = 'failed', // 發送失敗
}

/** 合法轉移 */
export const ALLOWED_TRANSITIONS: Record<EmailStatus, EmailStatus[]> = {
  [EmailStatus.PENDING]: [EmailStatus.APPROVED, EmailStatus.REJECTED],
  [EmailStatus.APPROVED]: [
    EmailStatus.SENT,
    EmailStatus.REJECTED,
    EmailStatus.PENDING,
  ],
  [EmailStatus.REJECTED]: [EmailStatus.PENDING],
  [EmailStatus.FAILED]: [EmailStatus.APPROVED, EmailStatus.PENDING],
  [EmailStatus.SENT]: [], // 終態
};

export function canTransition(from: EmailStatus, to: EmailStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** DB 可能有未知/舊值，正規化 */
export function normalizeStatus(raw: string | null | undefined): EmailStatus {
  const v = (raw ?? '').toLowerCase();
  if ((Object.values(EmailStatus) as string[]).includes(v)) {
    return v as EmailStatus;
  }
  return EmailStatus.PENDING;
}
