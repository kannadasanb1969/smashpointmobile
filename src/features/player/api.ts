import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/apiClient';
export const playerKeys = {
  tournaments: (filters: object) => ['tournaments', filters],
  tournament: (id: string) => ['tournament', id],
  players: ['players'],
  registrations: (id: string) => ['registrations', id],
  activeRegistrations: (id: string) => ['registrations', id, 'active'],
  profile: (id: string) => ['profile', id],
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
