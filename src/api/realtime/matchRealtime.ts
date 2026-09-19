import { env } from '../../config/env';
export type MatchRealtimeEvent = {
  type: 'MATCH_STARTED' | 'MATCH_SCORE_UPDATED' | 'MATCH_COMPLETED';
  matchId: string;
  status: string;
  participant1Score?: number;
  participant2Score?: number;
  winningPoints?: number;
  winnerParticipantId?: string | null;
  winnerParticipantName?: string | null;
  updatedAt?: string;
};
export type RealtimeState = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';
export const parseMatchRealtimeEvent = (
  raw: string,
  matchId: string,
): MatchRealtimeEvent | null => {
  try {
    const x = JSON.parse(raw);
    if (
      !['MATCH_STARTED', 'MATCH_SCORE_UPDATED', 'MATCH_COMPLETED'].includes(x?.type) ||
      String(x.matchId) !== String(matchId) ||
      typeof x.status !== 'string'
    )
      return null;
    if (
      x.participant1Score != null &&
      (!Number.isInteger(x.participant1Score) || x.participant1Score < 0)
    )
      return null;
    if (
      x.participant2Score != null &&
      (!Number.isInteger(x.participant2Score) || x.participant2Score < 0)
    )
      return null;
    return x;
  } catch {
    return null;
  }
};
export const realtimeUrl = (id: string, token: string) =>
  `${env.apiBaseUrl.replace(/^http/, 'ws')}/api/realtime/matches/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`;
export const subscribeToMatchRealtime = (
  id: string,
  token: string,
  onEvent: (e: MatchRealtimeEvent) => void,
  onReconnect?: () => void,
) => {
  let socket: WebSocket | null = null,
    closed = false,
    retry = 0,
    timer: ReturnType<typeof setTimeout> | undefined;
  const connect = () => {
    if (closed) return;
    socket = new WebSocket(realtimeUrl(id, token));
    socket.onopen = () => {
      retry = 0;
    };
    socket.onmessage = (e) => {
      const event = parseMatchRealtimeEvent(String(e.data), id);
      if (event) onEvent(event);
    };
    socket.onclose = () => {
      if (closed) return;
      const delay = Math.min(30000, 1000 * 2 ** retry++);
      timer = setTimeout(() => {
        onReconnect?.();
        connect();
      }, delay);
    };
  };
  connect();
  return () => {
    closed = true;
    if (timer) clearTimeout(timer);
    socket?.close();
  };
};
