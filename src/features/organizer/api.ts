import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/apiClient';
export const organizerApi = {
  list: async (id: string) =>
    (await apiClient.get('/api/tournaments', { params: { organizerId: id } })).data,
  detail: async (id: string) => (await apiClient.get(`/api/tournaments/${id}`)).data,
  create: async (input: Record<string, unknown>) =>
    (await apiClient.post('/api/tournaments', input)).data,
  update: async (id: string, input: Record<string, unknown>) =>
    (await apiClient.put(`/api/tournaments/${id}`, input)).data,
  submit: async (id: string, organizerId: string) =>
    (await apiClient.post(`/api/tournaments/${id}/submit`, { organizerId })).data,
  createAndSubmit: async (input: Record<string, unknown>, organizerId: string) => {
    const created = await organizerApi.create({ ...input, organizerId });
    return organizerApi.submit(created.id, organizerId);
  },
  delete: async (id: string) => (await apiClient.delete(`/api/tournaments/${id}`)).data,
};
export const useOrganizerTournaments = (id: string) =>
  useQuery({
    queryKey: ['organizer-tournaments', id],
    queryFn: () => organizerApi.list(id),
    enabled: Boolean(id),
  });
export const useOrganizerMutation = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
      organizerId,
    }: {
      id?: string;
      input: Record<string, unknown>;
      organizerId: string;
    }) =>
      id
        ? organizerApi.update(id, { ...input, organizerId })
        : organizerApi.createAndSubmit(input, organizerId),
    onSuccess: () => {
      void q.invalidateQueries({ queryKey: ['organizer-tournaments'] });
      // Distinct key (singular) used by the Tournament Details screen — without this, an edit's
      // save doesn't refresh Details until an unrelated refetch happens to occur (e.g. a manual
      // pull-to-refresh), since Details stays mounted across router.back() in the Expo Router stack.
      void q.invalidateQueries({ queryKey: ['organizer-tournament'] });
    },
  });
};
export const useOrganizerDelete = () => {
  const q = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => organizerApi.delete(id),
    onSuccess: () => {
      void q.invalidateQueries({ queryKey: ['organizer-tournaments'] });
      void q.invalidateQueries({ queryKey: ['organizer-tournament'] });
    },
  });
};
