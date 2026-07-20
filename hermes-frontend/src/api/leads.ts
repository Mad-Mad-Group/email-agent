import client from './client';

export interface Lead {
  _id: string;
  company_name: string;
  industry_tags?: string[];
  source?: string;
  google_maps_url?: string;
  search_query?: string;
  email?: string;
  extra_emails?: string[];
  phone?: string;
  extra_phones?: string[];
  website?: string;
  address?: string;
  social_media?: Record<string, string>;
  rating?: string;
  website_description?: string;
  lead_id?: string;
  user_id?: string;
  // Backend 寫入時 `status = null` 表示 NEW (見 leads.service.ts findAll + lead.schema.ts)。
  // 唔加 null 嘅話 frontend 用 `=== 'new'` 比較會漏咗 null leads。
  status?: 'new' | 'pending' | 'contacted' | null;
  verification?: string;
  createdAt?: string;
  updatedAt?: string;
  _imported_at?: string;

  /* ── Reply fields (written by worker doReplyCheck) ── */
  _replied?: boolean;
  _reply_category?: 'interested' | 'not_interested' | 'meeting' | 'auto_reply' | 'question' | string;
  _reply_summary?: string;
  _reply_sentiment?: string;
  _reply_next_step?: string;
  _reply_via?: string;
  _reply_at?: string;
  _pending_meeting?: boolean;
  _followup_count?: number;
  _has_email_draft?: boolean;
}

export interface LeadListParams {
  page?: number;
  limit?: number;
  status?: string;
  verification?: string;
  industry?: string;
  source?: string;
  search?: string;
}

export interface LeadListResponse {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
}

export type CreateLeadPayload = Omit<Lead, '_id' | 'createdAt' | 'updatedAt'>;
export type UpdateLeadPayload = Partial<CreateLeadPayload>;

export const leadsApi = {
  list: (params?: LeadListParams) =>
    client.get<LeadListResponse>('/leads', { params }),

  get: (id: string) =>
    client.get<Lead>(`/leads/${id}`),

  create: (data: CreateLeadPayload) =>
    client.post<Lead>('/leads', data),

  update: (id: string, data: UpdateLeadPayload) =>
    client.patch<Lead>(`/leads/${id}`, data),

  remove: (id: string) =>
    client.delete(`/leads/${id}`),

  // ponytail: bulk clear — DELETE /leads (no :id). Backend must register this
  // route AFTER @Delete(':id') so the empty path resolves to the collection.
  clearAll: () =>
    client.delete<{ deleted: number }>('/leads'),

  changeStatus: (id: string, status: string, note?: string) =>
    client.patch(`/leads/${id}/status`, { status, note }),

  markInterested: (id: string) =>
    client.post(`/leads/${id}/mark-interested`),

  scrape: (id: string) =>
    client.post(`/leads/${id}/scrape`),

  reprocess: (id: string, stage: string) =>
    client.post(`/leads/${id}/reprocess?stage=${stage}`),

  simulateNoReply: (id: string) =>
    client.post<{ task_id: string; lead_id: string; followup_count: number }>(`/leads/${id}/simulate-no-reply`),
};
