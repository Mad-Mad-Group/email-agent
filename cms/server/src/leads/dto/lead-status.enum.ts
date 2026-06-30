/**
 * Lead 外展 pipeline 狀態機（對應 DB `leads.status` 欄）。
 * ⚠️ DB 真實情況：status = null（未聯絡）或 "contacted"。
 *    null 一律當作 NEW 處理（見 normalizeStatus）。
 */
export enum LeadStatus {
  NEW = 'new', // DB 入面係 null
  PENDING = 'pending',
  CONTACTED = 'contacted',
}

/** DB 嘅 status（可能 null / "" / "contacted"…）正規化成 LeadStatus */
export function normalizeStatus(raw: string | null | undefined): LeadStatus {
  if (!raw || raw === 'new') return LeadStatus.NEW;
  if (raw === 'pending') return LeadStatus.PENDING;
  if (raw === 'contacted') return LeadStatus.CONTACTED;
  return LeadStatus.NEW; // 未知值保守當 NEW
}

/** 寫返 DB 時：NEW → null（保持同 Python 一致），其餘照字串存 */
export function toDbStatus(s: LeadStatus): string | null {
  return s === LeadStatus.NEW ? null : s;
}

/**
 * 合法狀態轉移表。service 改狀態前一定要查，唔合法掉 BadRequest。
 * （要加 replied / meeting 等狀態時，喺度加 enum + 轉移即可。）
 */
export const ALLOWED_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  [LeadStatus.NEW]: [LeadStatus.PENDING, LeadStatus.CONTACTED],
  [LeadStatus.PENDING]: [LeadStatus.CONTACTED, LeadStatus.NEW],
  [LeadStatus.CONTACTED]: [], // 終態；要重發走 force 另一條路
};

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return true; // 冪等
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
