import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi, LeadListParams } from './leads';
import { emailQueueApi, EmailListParams } from './emailQueue';
import { notificationsApi } from './notifications';
import { tasksApi, searchApi, hermesApi, SearchPayload, usersApi, settingsApi, aiApi, AgentSkillStats, verifiedEmailsApi } from './services';
import { authApi } from './auth';

/* ── Auth ── */

export const useMe = () =>
  useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me().then(r => r.data),
    retry: false,
  });

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; email?: string }) =>
      authApi.updateProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
};

export const useChangePassword = () =>
  useMutation({
    mutationFn: ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) =>
      authApi.changePassword(oldPassword, newPassword),
  });

/* ── Leads ── */

export const useLeads = (params?: LeadListParams) =>
  useQuery({
    queryKey: ['leads', params],
    queryFn: () => leadsApi.list(params).then(r => r.data),
    refetchInterval: 120_000, // SSE 即時更新為主，polling 做 fallback
  });

export const useLead = (id: string) =>
  useQuery({
    queryKey: ['leads', id],
    queryFn: () => leadsApi.get(id).then(r => r.data),
    enabled: !!id,
  });

export const useCreateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: leadsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
};

export const useUpdateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      leadsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
};

export const useDeleteLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
};

// ponytail: bulk-clear hook. Returns deleted-count from server so the caller
// can show "已清 N 筆" feedback.
export const useClearAllLeads = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => leadsApi.clearAll().then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
};

export const useChangeLeadStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      leadsApi.changeStatus(id, status, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
};

export const useScrapeLead = () =>
  useMutation({ mutationFn: (id: string) => leadsApi.scrape(id) });

export const useReprocessLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      leadsApi.reprocess(id, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
};

/* ── Email Queue ── */

export const useEmailQueue = (params?: EmailListParams) =>
  useQuery({
    queryKey: ['emailQueue', params],
    queryFn: () => emailQueueApi.list(params).then(r => r.data),
    refetchInterval: 120_000, // SSE 即時更新為主，polling 做 fallback
  });

export const useEmailItem = (id: string) =>
  useQuery({
    queryKey: ['emailQueue', id],
    queryFn: () => emailQueueApi.get(id).then(r => r.data),
    enabled: !!id,
  });

export const useApproveEmail = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => emailQueueApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emailQueue'] }),
  });
};

export const useRejectEmail = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      emailQueueApi.reject(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emailQueue'] }),
  });
};

export const useSendEmail = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => emailQueueApi.send(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emailQueue'] }),
  });
};

export const useBulkApproveEmails = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => emailQueueApi.bulkApprove(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emailQueue'] }),
  });
};

export const useBulkRejectEmails = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, reason }: { ids: string[]; reason?: string }) =>
      emailQueueApi.bulkReject(ids, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emailQueue'] }),
  });
};

export const useBulkSendEmails = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => emailQueueApi.bulkSend(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emailQueue'] }),
  });
};

/* ── Search ── */

export const useSearch = () =>
  useMutation({ mutationFn: (data: SearchPayload) => hermesApi.run(data) });

/* ── Tasks ── */

export const useTasks = () =>
  useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.list().then(r => r.data),
    refetchInterval: 120_000, // SSE 即時更新為主，polling 做 fallback
  });

export const useAgentStats = () =>
  useQuery({
    queryKey: ['tasks', 'stats'],
    queryFn: () => tasksApi.stats().then(r => r.data as unknown as AgentSkillStats[]),
    refetchInterval: 120_000,
  });

/* ── Users ── */

export const useUsers = (params?: { page?: number; limit?: number }) =>
  useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.list(params).then(r => r.data),
  });

/* ── Settings ── */

export const useSettings = () =>
  useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAll().then(r => r.data),
  });

/* ── AI ── */

export const useAnalyzeLead = () =>
  useMutation({ mutationFn: (leadId: string) => aiApi.analyze(leadId) });

export const useLeadAnalyses = (leadId: string) =>
  useQuery({
    queryKey: ['analyses', leadId],
    queryFn: () => aiApi.listAnalyses(leadId).then(r => r.data),
    enabled: !!leadId,
  });

/* ── Legacy compatibility — keep old hook names working ── */

export const useDashboardStats = () =>
  useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [leadsRes] = await Promise.all([
        leadsApi.list({ page: 1, limit: 5 }),
      ]);
      return {
        totalLeads: (leadsRes.data as any)?.total ?? 0,
        recentLeads: (leadsRes.data as any)?.data ?? [],
      };
    },
    refetchInterval: 120_000, // SSE 即時更新為主，polling 做 fallback
  });

export const useEmailDrafts = () => useEmailQueue();
export const useSearchResults = () =>
  useQuery({ queryKey: ['search-results'], queryFn: () => Promise.resolve([]) });
export const useAgents = () =>
  useQuery({
    queryKey: ['agents'],
    queryFn: () => Promise.resolve({
      agents: [
        {
          id: 'agent-1',
          name: 'Lead Scraper',
          type: 'Web Crawler',
          status: 'running' as const,
          description: 'Scrapes target websites for potential leads',
          logs: ['Scanning techcrunch.com...', 'Found 23 new leads', 'Dedup complete'],
          tasksCompleted: 1847,
          successRate: 94.2,
          lastRun: '2 min ago',
          taskSteps: [
            { date: 'JUN 24', label: 'Scan initiated', status: 'done' as const },
            { date: 'JUN 24', label: 'Crawling techcrunch.com', status: 'done' as const, detail: 'Found 23 potential leads from 148 pages' },
            { date: 'JUN 25', label: 'Crawling producthunt.com', status: 'done' as const, detail: 'Found 15 leads, 3 duplicates removed' },
            { date: 'JUN 25', label: 'Deduplication', status: 'done' as const, detail: '35 unique leads after cross-source dedup' },
            { date: 'JUN 26', label: 'Data enrichment', status: 'active' as const, detail: 'Enriching company info via Clearbit API' },
            { date: 'JUN 26', label: 'Export to pipeline', status: 'pending' as const },
          ],
        },
        {
          id: 'agent-2',
          name: 'Email Sender',
          type: 'Outreach Automation',
          status: 'idle' as const,
          description: 'Sends personalized outreach emails in batches',
          logs: ['Batch #42 sent (50 emails)', 'Bounce rate: 2.1%', 'Waiting for next batch...'],
          tasksCompleted: 3210,
          successRate: 97.8,
          lastRun: '15 min ago',
          taskSteps: [
            { date: 'JUN 23', label: 'Batch #42 queued', status: 'done' as const },
            { date: 'JUN 23', label: 'Templates personalized', status: 'done' as const, detail: '50 emails generated with AI-crafted subject lines' },
            { date: 'JUN 24', label: 'Sending in progress', status: 'done' as const, detail: '50/50 sent, bounce rate 2.1%' },
            { date: 'JUN 25', label: 'Delivery verified', status: 'done' as const, detail: '49 delivered, 1 bounced (invalid domain)' },
            { date: 'JUN 26', label: 'Open tracking', status: 'done' as const, detail: '32 opens (65.3%), 8 clicks (16.3%)' },
            { date: 'JUN 27', label: 'Batch #43 scheduled', status: 'pending' as const },
          ],
        },
        {
          id: 'agent-3',
          name: 'Lead Qualifier',
          type: 'AI Scoring',
          status: 'running' as const,
          description: 'Scores and qualifies leads based on engagement signals',
          logs: ['Scoring batch #18...', 'Qualified: 12 / Rejected: 8', 'Avg score: 0.73'],
          tasksCompleted: 956,
          successRate: 88.5,
          lastRun: 'Just now',
          taskSteps: [
            { date: 'JUN 25', label: 'Batch #18 received', status: 'done' as const, detail: '20 leads from Scraper pipeline' },
            { date: 'JUN 25', label: 'Engagement signals collected', status: 'done' as const, detail: 'Email opens, website visits, social activity' },
            { date: 'JUN 26', label: 'AI scoring complete', status: 'done' as const, detail: '12 qualified (≥0.7), 8 rejected, avg 0.73' },
            { date: 'JUN 26', label: 'High-priority flagged', status: 'active' as const, detail: '3 leads scored >0.9 — ready for sales' },
            { date: 'JUN 26', label: 'CRM sync', status: 'pending' as const },
          ],
        },
      ],
      feed: [
        { time: '10:32', event: 'scrape', message: 'Lead Scraper found 23 new leads from techcrunch.com' },
        { time: '10:28', event: 'qualify', message: 'Lead Qualifier scored 20 leads — 12 qualified' },
        { time: '10:15', event: 'email', message: 'Email Sender completed batch #42 (50 emails, 2.1% bounce)' },
        { time: '09:58', event: 'scrape', message: 'Lead Scraper finished scanning producthunt.com (15 leads)' },
        { time: '09:45', event: 'qualify', message: 'Lead Qualifier flagged 3 high-priority leads (score > 0.9)' },
        { time: '09:30', event: 'email', message: 'Email Sender started batch #42' },
        { time: '09:12', event: 'scrape', message: 'Lead Scraper started daily scan cycle' },
      ],
    }),
  });

/* ── Notifications ── */

export const useNotifications = (params?: { read?: boolean; limit?: number; page?: number }) =>
  useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationsApi.list(params).then(r => r.data),
    refetchInterval: 120_000, // SSE 即時更新為主，polling 做 fallback // 30s polling
  });

export const useUnreadCount = () =>
  useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.unreadCount().then(r => (r.data as any)?.unread_count ?? 0),
    refetchInterval: 120_000, // SSE 即時更新為主，polling 做 fallback
  });

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useDismissNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.dismiss(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useDismissAllNotifications = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.dismissAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

/* ── Verified Emails ── */

export const useVerifiedEmails = (params?: { page?: number; limit?: number; search?: string; status?: string; verification_method?: string }) =>
  useQuery({
    queryKey: ['verified-emails', params],
    queryFn: () => verifiedEmailsApi.list(params).then(r => r.data),
  });

export const useVerifiedEmailStats = () =>
  useQuery({
    queryKey: ['verified-emails', 'stats'],
    queryFn: () => verifiedEmailsApi.stats().then(r => r.data),
  });

export const useCreateVerifiedEmail = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; company_name: string; notes?: string }) =>
      verifiedEmailsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['verified-emails'] });
    },
  });
};

export const useDeleteVerifiedEmail = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => verifiedEmailsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['verified-emails'] });
    },
  });
};
