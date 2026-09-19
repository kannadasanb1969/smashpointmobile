import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/apiClient';
export type Notification = {
  id: string;
  title?: string;
  message?: string;
  isRead?: boolean;
  readAt?: string;
  createdAt?: string;
};
export const notificationIsUnread = (item: Notification) => !item.isRead;
export const unreadNotificationCount = (items: Notification[]) =>
  items.filter(notificationIsUnread).length;
export const notificationApi = {
  list: (userId: string) =>
    apiClient.get<Notification[]>('/api/notifications', { params: { userId } }).then((r) => r.data),
  // Backend returns {count: N}, not a bare number — see notification.service.js `unread()`.
  unread: (userId: string) =>
    apiClient
      .get<{ count: number }>('/api/notifications/unread-count', { params: { userId } })
      .then((r) => r.data?.count ?? 0),
  read: (userId: string, id: string) =>
    apiClient
      .post(`/api/notifications/read/${id}`, null, { params: { userId } })
      .then((r) => r.data),
  readAll: (userId: string) =>
    apiClient.post('/api/notifications/read-all', null, { params: { userId } }).then((r) => r.data),
};
export const useNotifications = (id: string) => {
  const q = useQueryClient();
  const list = useQuery({
    queryKey: ['notifications', id],
    queryFn: () => notificationApi.list(id),
    enabled: Boolean(id),
  });
  const unread = useQuery({
    queryKey: ['notifications-unread', id],
    queryFn: () => notificationApi.unread(id),
    enabled: Boolean(id),
  });
  const read = useMutation({
    mutationFn: (n: string) => notificationApi.read(id, n),
    onSuccess: () => {
      void q.invalidateQueries({ queryKey: ['notifications', id] });
      void q.invalidateQueries({ queryKey: ['notifications-unread', id] });
    },
  });
  const readAll = useMutation({
    mutationFn: () => notificationApi.readAll(id),
    onSuccess: () => {
      void q.invalidateQueries({ queryKey: ['notifications', id] });
      void q.invalidateQueries({ queryKey: ['notifications-unread', id] });
    },
  });
  return { list, unread, read, readAll };
};
