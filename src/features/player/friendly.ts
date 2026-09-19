import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/apiClient';
export const friendlyKeys = {
  all: ['friendly-matches'],
  detail: (id: string) => ['friendly-matches', id],
  requests: (id: string) => ['friendly-matches', id, 'requests'],
  participants: (id: string) => ['friendly-matches', id, 'participants'],
  teams: (id: string) => ['friendly-matches', id, 'teams'],
  fixtures: (id: string) => ['friendly-matches', id, 'fixtures'],
  result: (id: string) => ['friendly-matches', id, 'result'],
  standings: (id: string) => ['friendly-matches', id, 'standings'],
};
export const friendlyIsOwner = (match: any, currentId: string) =>
  Boolean(match?.isCreator) ||
  String(match?.creator_player_id || match?.creatorPlayerId || '') === String(currentId);
export const pendingRequest = (status: string) => status === 'PENDING';
export const friendlyPairingReady = (match: any, participants: any[] = [], teams: any[]) =>
  match?.event_type === 'SINGLES'
    ? participants.length >= 6 && participants.length <= 16
    : participants.length >= 8 &&
      participants.length <= 16 &&
      participants.length % 2 === 0 &&
      teams.length * 2 === participants.length;
export const friendlyPairingLocked = (fixtures: any) => Boolean(fixtures?.fixture || fixtures?.id);
export const friendlyStatusLabel = (status: string) =>
  (
    ({
      OPEN: 'Open',
      ACTIVE: 'Active',
      COMPLETED: 'Completed',
      CLEANUP_PENDING: 'Cleanup Pending',
      DELETED: 'Deleted',
      DRAFT: 'Draft',
    }) as Record<string, string>
  )[status] || 'Status unavailable';
export const cleanupAllowed = (match: any, currentId: string) =>
  friendlyIsOwner(match, currentId) && match?.status === 'CLEANUP_PENDING';
export const getFriendlyDetailsActions = (x: {
  isCreator: boolean;
  eventType: string;
  isReady: boolean;
  hasFixtures: boolean;
}) => ({
  showManagePairings: x.isCreator && x.eventType === 'DOUBLES' && !x.hasFixtures,
  showGenerateFixtures: x.isCreator && !x.hasFixtures && x.isReady,
  showViewFixtures: x.hasFixtures,
});
export const resolveFriendlySide = (value: any, players: any[] = [], teams: any[] = []) => {
  if (value == null || value === '') return 'TBD';
  const source = typeof value === 'object' ? value : { id: value };
  const id = source.id ?? source.player_id ?? source.team_id;
  const type = String(source.type ?? source.participant_type ?? source.participantType ?? '').toUpperCase();
  if (type === 'BYE' || source.isBye === true) return 'BYE';
  if (type === 'TEAM' || source.team_id != null) {
    const team = teams.find((x) => String(x.id) === String(id));
    const members = Array.isArray(team?.members) ? team.members : [];
    return members.map((m: any) => m.name || m.full_name || m.fullName).filter(Boolean).join(' / ') || 'TBD';
  }
  if (type === 'PLAYER' || type === '') {
    const player = players.find((x) => String(x.id ?? x.player_id) === String(id));
    return player?.name || player?.full_name || player?.fullName || 'TBD';
  }
  return 'TBD';
};
export const friendlyLifecycleApi = {
  result: async (id: string) => (await apiClient.get(`/api/friendly-matches/${id}/result`)).data,
  standings: async (id: string) =>
    (await apiClient.get(`/api/friendly-matches/${id}/standings`)).data,
  // Transitions the match to COMPLETED once its final (KNOCKOUT) or all (LEAGUE) games are done.
  // This is a required step: `close` rejects with 409 unless status is already COMPLETED, and nothing
  // else sets that status — so Close/Cleanup are unreachable unless finalize is called first.
  finalize: async (id: string) =>
    (await apiClient.post(`/api/friendly-matches/${id}/finalize`, {})).data,
  close: async (id: string) => (await apiClient.post(`/api/friendly-matches/${id}/close`, {})).data,
  cleanup: async (id: string) =>
    (await apiClient.post(`/api/friendly-matches/${id}/cleanup`, {})).data,
};
export const friendlyScoringApi = {
  start: async (fid: string, mid: string, target: number) =>
    (
      await apiClient.post(`/api/friendly-matches/${fid}/matches/${mid}/start`, {
        winningPoints: target,
      })
    ).data,
  score: async (fid: string, mid: string, side: 'A' | 'B', action: 'INCREMENT' | 'DECREMENT') =>
    (await apiClient.post(`/api/friendly-matches/${fid}/matches/${mid}/score`, { side, action }))
      .data,
  complete: async (fid: string, mid: string) =>
    (await apiClient.post(`/api/friendly-matches/${fid}/matches/${mid}/complete`, {})).data,
};
export const createInFlightGuard = () => {
  let active = false;
  return {
    tryStart: () => (active ? false : ((active = true), true)),
    release: () => {
      active = false;
    },
  };
};
export const isFriendlyRequestWorkflowConflict = (error: any) =>
  error?.status === 409 &&
  /no longer pending|already processed|at capacity/i.test(String(error?.message || ''));
export type FriendlyRequestFailureKind = 'WORKFLOW_STALE' | 'CAPACITY_FULL' | 'NORMAL_ERROR';
export const classifyFriendlyRequestFailure = (error: any): FriendlyRequestFailureKind =>
  error?.status === 409 && /at capacity/i.test(String(error?.message || ''))
    ? 'CAPACITY_FULL'
    : error?.status === 409 &&
        /no longer pending|already processed/i.test(String(error?.message || ''))
      ? 'WORKFLOW_STALE'
      : 'NORMAL_ERROR';
export const recoverFriendlyRequestFailure = (client: any, id: string) =>
  Promise.all([
    client.invalidateQueries({ queryKey: friendlyKeys.all }),
    client.invalidateQueries({ queryKey: friendlyKeys.detail(id) }),
    client.invalidateQueries({ queryKey: friendlyKeys.requests(id) }),
    client.invalidateQueries({ queryKey: friendlyKeys.participants(id) }),
  ]);
export const friendlyApi = {
  list: async () => (await apiClient.get('/api/friendly-matches')).data,
  detail: async (id: string) => (await apiClient.get(`/api/friendly-matches/${id}`)).data,
  create: async (payload: unknown) => (await apiClient.post('/api/friendly-matches', payload)).data,
  join: async (id: string) => (await apiClient.post(`/api/friendly-matches/${id}/join`, {})).data,
  participants: async (id: string) =>
    (await apiClient.get(`/api/friendly-matches/${id}/participants`)).data,
  requests: async (id: string) =>
    (await apiClient.get(`/api/friendly-matches/${id}/join-requests`)).data,
  approve: async (x: { id: string; requestId: string }) =>
    (await apiClient.post(`/api/friendly-matches/${x.id}/join-requests/${x.requestId}/approve`, {}))
      .data,
  reject: async (x: { id: string; requestId: string }) =>
    (await apiClient.post(`/api/friendly-matches/${x.id}/join-requests/${x.requestId}/reject`, {}))
      .data,
  teams: async (id: string) => (await apiClient.get(`/api/friendly-matches/${id}/teams`)).data,
  addTeam: async (x: { id: string; playerIds: [string, string] }) =>
    (await apiClient.post(`/api/friendly-matches/${x.id}/teams`, { playerIds: x.playerIds })).data,
  deleteTeam: async (x: { id: string; teamId: string }) =>
    apiClient.delete(`/api/friendly-matches/${x.id}/teams/${x.teamId}`),
  shuffle: async (id: string) =>
    (await apiClient.post(`/api/friendly-matches/${id}/shuffle-partners`, {})).data,
  fixtures: async (id: string) =>
    (await apiClient.get(`/api/friendly-matches/${id}/fixtures`)).data,
  generateFixtures: async (id: string) =>
    (await apiClient.post(`/api/friendly-matches/${id}/fixtures`, {})).data,
  resetFixtures: async (id: string) =>
    (await apiClient.post(`/api/friendly-matches/${id}/fixtures/reset`, {})).data,
};
export const useFriendlyList = () =>
  useQuery({ queryKey: friendlyKeys.all, queryFn: friendlyApi.list });
export const useFriendlyDetail = (id: string) =>
  useQuery({
    queryKey: friendlyKeys.detail(id),
    queryFn: () => friendlyApi.detail(id),
    enabled: Boolean(id),
  });
export const useFriendlyParticipants = (id: string) =>
  useQuery({
    queryKey: friendlyKeys.participants(id),
    queryFn: () => friendlyApi.participants(id),
    enabled: Boolean(id),
  });
export const useFriendlyRequests = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: friendlyKeys.requests(id),
    queryFn: () => friendlyApi.requests(id),
    enabled,
  });
export const invalidateFriendly = async (c: any, id: string) =>
  Promise.all([
    c.invalidateQueries({ queryKey: friendlyKeys.all }),
    c.invalidateQueries({ queryKey: friendlyKeys.detail(id) }),
    c.invalidateQueries({ queryKey: friendlyKeys.participants(id) }),
    c.invalidateQueries({ queryKey: friendlyKeys.requests(id) }),
  ]);
export const useFriendlyJoin = (id: string) => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: () => friendlyApi.join(id),
    onSuccess: () => invalidateFriendly(c, id),
  });
};
export const useFriendlyDecision = (id: string, kind: 'approve' | 'reject') => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => friendlyApi[kind]({ id, requestId }),
    onSuccess: () => invalidateFriendly(c, id),
  });
};
