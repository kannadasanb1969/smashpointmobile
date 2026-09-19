import { apiClient } from '../../api/apiClient';
export const canCompleteMatch = (a: number, b: number, target: number) =>
  Math.max(a, b) >= target && Math.abs(a - b) >= 2;
export const scoringActions = (x: {
  authorized: boolean;
  status: string;
  scoreA: number;
  scoreB: number;
  target: number;
}) => ({
  readOnly: !x.authorized || x.status === 'COMPLETED',
  canStart: x.authorized && x.status === 'SCHEDULED',
  // Keep scoring available through target/deuce states (for example 15-15 and
  // 16-15), but stop incrementing once the authoritative win condition is
  // reached. The backend rejects further increments at that point and expects
  // the host to complete the match or decrement to correct the score.
  canIncrement:
    x.authorized &&
    x.status === 'LIVE' &&
    !canCompleteMatch(x.scoreA, x.scoreB, x.target),
  canDecrement: (side: 'A' | 'B') =>
    x.authorized && x.status === 'LIVE' && (side === 'A' ? x.scoreA : x.scoreB) > 0,
  canComplete:
    x.authorized && x.status === 'LIVE' && canCompleteMatch(x.scoreA, x.scoreB, x.target),
});
export const scoreAllowed = (score: number, action: 'INCREMENT' | 'DECREMENT') =>
  action === 'INCREMENT' || score > 0;
type Actor = { requestedByUserId?: string };
export const scoringApi = {
  match: async (id: string) => (await apiClient.get(`/api/matches/${id}`)).data,
  start: async (id: string, payload: Actor & { winningPoints?: number } = {}) =>
    (await apiClient.post(`/api/matches/${id}/start`, payload)).data,
  score: async (
    id: string,
    payload: { side: 'A' | 'B'; action: 'INCREMENT' | 'DECREMENT' } & Actor,
  ) => (await apiClient.post(`/api/matches/${id}/score`, payload)).data,
  complete: async (id: string, payload: Actor = {}) =>
    (await apiClient.post(`/api/matches/${id}/complete`, payload)).data,
};
export const isStaleScoringError = (error: any, operation: 'start' | 'score' | 'complete') =>
  error?.status === 409 &&
  ((operation === 'start' && /already started|must be scheduled/i.test(String(error.message))) ||
    (operation === 'score' && /must be live|already completed/i.test(String(error.message))) ||
    (operation === 'complete' && /already completed|must be live/i.test(String(error.message))));
