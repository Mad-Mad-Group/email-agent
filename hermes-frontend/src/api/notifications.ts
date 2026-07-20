import client from './client';

export interface NotificationItem {
  _id: string;
  title: string;
  message?: string;
  type: 'lead' | 'email' | 'campaign' | 'task' | 'system';
  ref_id?: string;
  read: boolean;
  created_at: string;
  action?: string;
  action_params?: Record<string, any>;
  /** i18n key for title (frontend uses t(title_key, title_params)) */
  title_key?: string;
  title_params?: Record<string, any>;
  /** i18n key for message */
  message_key?: string;
  message_params?: Record<string, any>;
}

export interface NotificationListResponse {
  data: NotificationItem[];
  total: number;
  unread_count: number;
  page: number;
  limit: number;
}

export const notificationsApi = {
  list: (params?: { read?: boolean; limit?: number; page?: number }) =>
    client.get<NotificationListResponse>('/notifications', { params }),

  unreadCount: () =>
    client.get<{ unread_count: number }>('/notifications/unread-count'),

  markRead: (id: string) =>
    client.patch(`/notifications/${id}/read`),

  markAllRead: () =>
    client.post('/notifications/mark-all-read'),

  dismiss: (id: string) =>
    client.delete(`/notifications/${id}`),

  dismissAll: () =>
    client.post('/notifications/dismiss-all'),
};
