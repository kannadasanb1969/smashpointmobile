import { apiClient } from '../../api/apiClient';
export const ops = {
  publish: (id: string, adminUserId: string) =>
    apiClient.post(`/api/tournaments/${id}/publish`, { adminUserId }),
  registrations: (id: string) => apiClient.get(`/api/registrations/tournament/${id}`),
  fixtures: (tournamentId: string, categoryId?: string) =>
    apiClient.get('/api/fixtures', {
      params: { tournamentId, ...(categoryId ? { categoryId } : {}) },
    }),
  generate: (tournamentId: string, categoryId: string, format: string, organizerUserId: string) =>
    apiClient.post('/api/fixtures/generate', {
      tournamentId,
      categoryId,
      format,
      organizerUserId,
    }),
  publishFixture: (id: string) => apiClient.post(`/api/fixtures/${id}/publish`, {}),
};
