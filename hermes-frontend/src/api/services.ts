import client from './client';

/* ── Users ── */

export interface UserItem {
  _id: string;
  email: string;
  name: string;
  role: string;
  permissions?: string[];
  createdAt?: string;
}

export const usersApi = {
  list: (params?: { page?: number; limit?: number }) =>
    client.get('/users', { params }),
  get: (id: string) => client.get(`/users/${id}`),
  update: (id: string, data: Record<string, unknown>) =>
    client.patch(`/users/${id}`, data),
  remove: (id: string) => client.delete(`/users/${id}`),
};

/* ── Roles ── */

export interface RoleItem {
  _id: string;
  name: string;
  permissions: string[];
}

export const rolesApi = {
  list: (params?: { page?: number; limit?: number }) =>
    client.get('/roles', { params }),
  create: (data: { name: string; permissions: string[] }) =>
    client.post('/roles', data),
  get: (id: string) => client.get(`/roles/${id}`),
  update: (id: string, data: Partial<RoleItem>) =>
    client.patch(`/roles/${id}`, data),
  remove: (id: string) => client.delete(`/roles/${id}`),
};

/* ── Settings ── */

export const settingsApi = {
  getAll: () => client.get('/settings'),
  update: (data: Record<string, unknown>) =>
    client.patch('/settings', data),
};

/* ── Search ── */

export interface SearchPayload {
  keyword: string;
  location: string;
  targetCount: number;
  mode?: 'normal' | 'old_website';
}

export const searchApi = {
  run: (data: SearchPayload) => client.post('/search', data),
};

/* ── Tasks ── */

export interface TaskItem {
  _id: string;
  type?: string;
  status?: string;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  claimedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgentSkillStats {
  _id: string; // skill_id: S1, S2, S3, S4
  completed: number;
  failed: number;
  running: number;
  pending: number;
  last_run: string | null;
}

export const tasksApi = {
  list: () => client.get('/tasks'),
  stats: () => client.get<AgentSkillStats[]>('/tasks/stats'),
  get: (id: string) => client.get(`/tasks/${id}`),
  enqueue: (data?: Record<string, unknown>) =>
    client.post('/tasks', data),
  claim: (data?: Record<string, unknown>) =>
    client.post('/tasks/claim', data),
  complete: (taskId: string, data?: Record<string, unknown>) =>
    client.post(`/tasks/${taskId}/complete`, data),
  fail: (taskId: string, data?: Record<string, unknown>) =>
    client.post(`/tasks/${taskId}/fail`, data),
};

/* ── AI Analysis ── */

export const aiApi = {
  analyze: (leadId: string) =>
    client.post(`/ai/leads/${leadId}/analyze`),
  listAnalyses: (leadId: string) =>
    client.get(`/ai/leads/${leadId}/analyses`),
};

/* ── Hermes Pipeline ── */

export const hermesApi = {
  run: (data: SearchPayload) =>
    client.post('/hermes/run', data),
  getCampaign: (id: string) =>
    client.get(`/hermes/campaigns/${id}`),
};

/* ── Uploads ── */

export const uploadsApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

/* ── Jobs ── */

export const jobsApi = {
  run: (name: string) => client.post(`/jobs/${name}/run`),
};

/* ── Verified Emails ── */

export interface VerifiedEmailItem {
  _id: string;
  email: string;
  company_name: string;
  domain: string;
  source_user_id: string;
  source_lead_id?: string;
  verification_method: string;
  reply_count: number;
  match_count: number;
  status: string;
  notes?: string;
  created_at?: string;
}

export const verifiedEmailsApi = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: string; verification_method?: string }) =>
    client.get('/verified-emails', { params }),
  stats: () => client.get('/verified-emails/stats'),
  create: (data: { email: string; company_name: string; notes?: string }) =>
    client.post('/verified-emails', data),
  remove: (id: string) => client.delete(`/verified-emails/${id}`),
  exportUrl: () => `${client.defaults.baseURL}/verified-emails/export`,
};
