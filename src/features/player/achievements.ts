import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/apiClient';
export type Medal = {
  id: string;
  position?: string;
  medalType?: string;
  tournamentName?: string;
  categoryName?: string;
  achievedAt?: string;
  playerName?: string;
};
export const medalDisplay = (medal: Medal) => medal.position || medal.medalType || 'Medal';
export const resultDisplay = (result: any) => ({
  winner: result.winnerName || result.winner?.name || 'Winner unavailable',
  runnerUp: result.runnerUpName || result.runnerUp?.name || 'Runner-up unavailable',
});
export const achievementsApi = {
  medals: (playerId: string) =>
    apiClient.get<Medal[]>(`/api/medals/player/${playerId}`).then((r) => r.data),
  results: () => apiClient.get<any[]>('/api/results').then((r) => r.data),
};
export const usePlayerMedals = (id: string) =>
  useQuery({
    queryKey: ['player-medals', id],
    queryFn: () => achievementsApi.medals(id),
    enabled: Boolean(id),
  });
export const useResults = () =>
  useQuery({ queryKey: ['results'], queryFn: achievementsApi.results });
