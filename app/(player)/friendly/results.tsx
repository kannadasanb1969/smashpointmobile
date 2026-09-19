import { Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  friendlyApi,
  friendlyKeys,
  friendlyLifecycleApi,
  friendlyIsOwner,
  useFriendlyDetail,
  useFriendlyParticipants,
  resolveFriendlySide,
  createInFlightGuard,
} from '../../../src/features/player/friendly';
import { useAuthStore } from '../../../src/store/authStore';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { PrimaryButton } from '../../../src/components/common/PrimaryButton';
import { colors } from '../../../src/theme';
export default function Results() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    me = useAuthStore((s) => s.user?.playerProfile?.id) || '',
    d = useFriendlyDetail(id),
    p = useFriendlyParticipants(id),
    t = useQuery({ queryKey: friendlyKeys.teams(id), queryFn: () => friendlyApi.teams(id) }),
    owner = friendlyIsOwner(d.data, me),
    isLeague = d.data?.format === 'LEAGUE',
    client = useQueryClient(),
    // KNOCKOUT exposes winner/runner-up via /result; LEAGUE exposes ranked standings via /standings —
    // these are two distinct backend endpoints, not one response shape.
    result = useQuery({
      queryKey: friendlyKeys.result(id),
      queryFn: () => friendlyLifecycleApi.result(id),
      enabled: !!id && !isLeague,
    }),
    standings = useQuery({
      queryKey: friendlyKeys.standings(id),
      queryFn: () => friendlyLifecycleApi.standings(id),
      enabled: !!id && isLeague,
    }),
    q = isLeague ? standings : result,
    guard = createInFlightGuard(),
    finalize = useMutation({
      mutationFn: () => friendlyLifecycleApi.finalize(id),
      onSuccess: () =>
        Promise.all([
          result.refetch(),
          standings.refetch(),
          d.refetch(),
          client.invalidateQueries({ queryKey: friendlyKeys.all }),
        ]),
      onError: (e: any) =>
        Alert.alert('Unable to finalize', e?.message || 'Please try again.'),
    });
  const finalizeNow = () => {
    if (finalize.isPending || !guard.tryStart()) return;
    finalize.mutate(undefined, { onSettled: () => guard.release() });
  };
  return (
    <ScreenContainer>
      <ScrollView
        refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} />}
      >
        <Text style={s.title}>{d.data?.title || 'Friendly Results'}</Text>
        {q.isLoading && <Text>Loading…</Text>}
        {q.isError && (
          <Text onPress={() => q.refetch()} style={s.error}>
            Results unavailable. Retry
          </Text>
        )}
        {owner && d.data?.status === 'ACTIVE' && (
          <PrimaryButton
            disabled={finalize.isPending}
            title={finalize.isPending ? 'Finalizing…' : 'Finalize Result'}
            onPress={finalizeNow}
          />
        )}
        {!isLeague && result.data && (
          <>
            <Text style={s.meta}>
              {d.data?.event_type} · {d.data?.format} · {result.data.status || d.data?.status}
            </Text>
            {result.data.winner || result.data.result ? (
              <>
                <Text style={s.heading}>Winner</Text>
                <Text style={s.card}>
                  {resolveFriendlySide(
                    result.data.winner?.participantId ?? result.data.result?.winnerName,
                    p.data || [],
                    t.data || [],
                  )}
                </Text>
                <Text style={s.heading}>Runner-up</Text>
                <Text style={s.card}>
                  {resolveFriendlySide(
                    result.data.runnerUp?.participantId ?? result.data.result?.runnerUpName,
                    p.data || [],
                    t.data || [],
                  )}
                </Text>
              </>
            ) : (
              <Text style={s.meta}>
                {owner
                  ? 'Finalize once the final match is complete to record the result.'
                  : 'Result not finalized yet.'}
              </Text>
            )}
          </>
        )}
        {isLeague && standings.data && (
          <>
            <Text style={s.meta}>
              {d.data?.event_type} · {d.data?.format} ·{' '}
              {standings.data.allGamesCompleted ? 'All matches complete' : 'In progress'}
            </Text>
            <Text style={s.heading}>Standings</Text>
            {(standings.data.standings || []).map((x: any, i: number) => (
              <Text key={x.participantId || i} style={s.card}>
                {resolveFriendlySide(x.participantId, p.data || [], t.data || [])} · {x.won} wins ·{' '}
                {x.played} played
              </Text>
            ))}
            {!(standings.data.standings || []).length && (
              <Text style={s.meta}>No completed matches yet.</Text>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '800', color: colors.text, marginTop: 35 },
  heading: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 20 },
  card: {
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
    color: colors.text,
  },
  meta: { color: colors.muted, marginTop: 8 },
  error: { color: colors.error },
});
