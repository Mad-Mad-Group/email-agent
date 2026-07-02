import client from './client';

export interface EmailItem {
  _id: string;
  email_id?: string;
  lead_id?: string;
  company_name?: string;
  to_email?: string;
  subject?: string;
  body?: string;
  // Backend default 係 'pending' (見 email-queue.schema.ts: default EmailStatus.PENDING)，
  // 但 normalizeStatus() 對未知值會 fallback 去 PENDING，所以 null/undefined 都合理。
  status?: 'pending' | 'approved' | 'rejected' | 'sent' | 'failed' | null;
  error?: { rejected_reason?: string } | null;
  // 草稿種類：'reply'=回應覆咗嘅人 / 'followup'=追未覆嘅人 / undefined=第一封 outreach
  _type?: string;
  _reply_category?: string;
  created_at?: string;
  sent_at?: string;
}

export interface EmailListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface EmailListResponse {
  data: EmailItem[];
  total: number;
  page: number;
  limit: number;
}

export const emailQueueApi = {
  list: (params?: EmailListParams) =>
    client.get<EmailListResponse>('/email-queue', { params }),

  get: (id: string) =>
    client.get<EmailItem>(`/email-queue/${id}`),

  edit: (id: string, data: { subject?: string; body?: string }) =>
    client.patch<EmailItem>(`/email-queue/${id}`, data),

  approve: (id: string) =>
    client.post(`/email-queue/${id}/approve`),

  reject: (id: string, reason?: string) =>
    client.post(`/email-queue/${id}/reject`, { reason }),

  send: (id: string) =>
    client.post(`/email-queue/${id}/send`),

  bulkApprove: (ids: string[]) =>
    client.post('/email-queue/bulk-approve', { ids }),

  bulkReject: (ids: string[], reason?: string) =>
    client.post('/email-queue/bulk-reject', { ids, reason }),

  bulkSend: (ids: string[]) =>
    client.post('/email-queue/bulk-send', { ids }),
};
