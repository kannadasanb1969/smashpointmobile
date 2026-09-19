import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { subscribeToMatchRealtime } from './matchRealtime';
export const useMatchRealtime = (matchId: string, refetch: () => unknown) => {
  const token = useAuthStore((s) => s.accessToken),
    client = useQueryClient(),
    ref = useRef(refetch);
  ref.current = refetch;
  useEffect(() => {
    if (!token || !matchId) return;
    const cleanup = subscribeToMatchRealtime(
      matchId,
      token,
      (event) => {
        client.setQueryData(['match', matchId], (old: any) => {
          if (!old) return old;
          if (event.updatedAt && old.updatedAt && event.updatedAt < old.updatedAt) return old;
          return {
            ...old,
            status: event.status,
            participant1Score: event.participant1Score ?? old.participant1Score,
            participant2Score: event.participant2Score ?? old.participant2Score,
            winningPoints: event.winningPoints ?? old.winningPoints,
            winnerParticipantId: event.winnerParticipantId ?? old.winnerParticipantId,
            winnerParticipantName: event.winnerParticipantName ?? old.winnerParticipantName,
            updatedAt: event.updatedAt ?? old.updatedAt,
          };
        });
      },
      () => {
        void ref.current();
      },
    );
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void ref.current();
    });
    return () => {
      sub.remove();
      cleanup();
    };
  }, [client, matchId, token]);
};
