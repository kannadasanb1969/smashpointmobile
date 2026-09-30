import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/apiClient';
export const playerKeys = {
  tournaments: (filters: object) => ['tournaments', filters],
  tournament: (id: string) => ['tournament', id],
  players: ['players'],
  registrations: (id: string) => ['registrations', id],
  activeRegistrations: (id: string) => ['registrations', id, 'active'],
  profile: (id: string) => ['profile', id],
};
export const connectionKeys = {
  all: ['player-connections'] as const,
  discover: (search: string) => ['player-connections', 'discover', search] as const,
  accepted: ['player-connections', 'accepted'] as const,
  requests: ['player-connections', 'requests'] as const,
  profile: (id: string) => ['player-connections', 'profile', id] as const,
};
export const playerApi = {
  tournaments: async (filters: Record<string, string>) =>
    (await apiClient.get('/api/tournaments', { params: filters })).data,
  tournament: async (id: string) => (await apiClient.get(`/api/tournaments/${id}`)).data,
  players: async () => (await apiClient.get('/api/players')).data,
  guests: async () => (await apiClient.get('/api/guest-players')).data,
  registrations: async () => (await apiClient.get('/api/registrations/me')).data,
  activeRegistrations: async () => (await apiClient.get('/api/registrations/me', { params: { scope: 'active' } })).data,
  profile: async (id: string) => (await apiClient.get(`/api/players/${id}`)).data,
  discoverConnections: async (search: string) =>
    (await apiClient.get('/api/connections/discover', { params: search ? { search } : undefined })).data,
  acceptedConnections: async () => (await apiClient.get('/api/connections')).data,
  connectionRequests: async () => (await apiClient.get('/api/connections/requests')).data,
  connectionProfile: async (id: string) => (await apiClient.get(`/api/connections/profile/${id}`)).data,
  requestConnection: async (id: string) => (await apiClient.post(`/api/connections/${id}`)).data,
  acceptConnection: async (id: string) => (await apiClient.post(`/api/connections/${id}/accept`)).data,
  declineConnection: async (id: string) => (await apiClient.post(`/api/connections/${id}/decline`)).data,
  unconnect: async (id: string) => (await apiClient.delete(`/api/connections/${id}`)).data,
};
export const useTournaments = (filters: Record<string, string>) =>
  useQuery({
    queryKey: playerKeys.tournaments(filters),
    queryFn: () => playerApi.tournaments(filters),
  });
export const useTournament = (id: string) =>
  useQuery({
    queryKey: playerKeys.tournament(id),
    queryFn: () => playerApi.tournament(id),
    enabled: Boolean(id),
  });
export const usePlayers = () =>
  useQuery({ queryKey: playerKeys.players, queryFn: playerApi.players });
export const useGuests = () => useQuery({ queryKey: ['guests'], queryFn: playerApi.guests });
export const useRegistrations = (id: string) =>
  useQuery({
    queryKey: playerKeys.registrations(id),
    queryFn: () => playerApi.registrations(),
    enabled: Boolean(id),
  });
export const useActiveRegistrations = (id: string) =>
  useQuery({
    queryKey: playerKeys.activeRegistrations(id),
    queryFn: () => playerApi.activeRegistrations(),
    enabled: Boolean(id),
  });
export const useProfile = (id: string) =>
  useQuery({
    queryKey: playerKeys.profile(id),
    queryFn: () => playerApi.profile(id),
    enabled: Boolean(id),
  });

export const useConnectionDiscover = (search: string) =>
  useQuery({ queryKey: connectionKeys.discover(search), queryFn: () => playerApi.discoverConnections(search) });
export const useAcceptedConnections = () =>
  useQuery({ queryKey: connectionKeys.accepted, queryFn: playerApi.acceptedConnections });
export const useConnectionRequests = () =>
  useQuery({ queryKey: connectionKeys.requests, queryFn: playerApi.connectionRequests });
export const useConnectionProfile = (id: string) =>
  useQuery({ queryKey: connectionKeys.profile(id), queryFn: () => playerApi.connectionProfile(id), enabled: Boolean(id) });

function useConnectionMutation<T extends (...args: any[]) => Promise<any>>(fn: T) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => client.invalidateQueries({ queryKey: connectionKeys.all }),
  });
}
export const useRequestConnection = () => useConnectionMutation(playerApi.requestConnection);
export const useAcceptConnection = () => useConnectionMutation(playerApi.acceptConnection);
export const useDeclineConnection = () => useConnectionMutation(playerApi.declineConnection);
export const useUnconnect = () => useConnectionMutation(playerApi.unconnect);
