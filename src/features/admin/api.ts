import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/apiClient';
export const adminApi = {
  pending: async () =>
    (await apiClient.get('/api/tournaments', { params: { status: 'PENDING_ADMIN_APPROVAL' } }))
      .data,
  all: async () =>
    ((await apiClient.get('/api/tournaments')).data || []).filter((x: any) => x.status !== 'DRAFT'),
  detail: async (id: string) => (await apiClient.get(`/api/tournaments/${id}`)).data,
  approve: async (id: string, adminUserId: string) =>
    (await apiClient.post(`/api/tournaments/${id}/approve`, { adminUserId })).data,
  reject: async (id: string, adminUserId: string, reason: string) =>
    (await apiClient.post(`/api/tournaments/${id}/reject`, { adminUserId, reason })).data,
  publish: async (id: string, adminUserId: string) =>
    (await apiClient.post(`/api/tournaments/${id}/publish`, { adminUserId })).data,
};
export const useAdminDecision = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: (x: {
      id: string;
      adminId: string;
      action: 'approve' | 'reject' | 'publish';
      reason?: string;
    }) =>
      x.action === 'approve'
        ? adminApi.approve(x.id, x.adminId)
        : x.action === 'reject'
          ? adminApi.reject(x.id, x.adminId, x.reason || '')
          : adminApi.publish(x.id, x.adminId),
    onSuccess: (_d, x) => {
      void q.invalidateQueries({ queryKey: ['admin-pending'] });
      void q.invalidateQueries({ queryKey: ['admin-tournaments'] });
      void q.invalidateQueries({ queryKey: ['admin-tournament', x.id] });
      void q.invalidateQueries({ queryKey: ['organizer-tournaments'] });
    },
  });
};
