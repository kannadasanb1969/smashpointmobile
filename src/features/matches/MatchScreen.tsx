import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scoringApi, scoringActions } from '../player/scoring';
import {
  friendlyApi,
  friendlyScoringApi,
  friendlyIsOwner,
  createInFlightGuard,
  resolveFriendlySide,
} from '../player/friendly';
import { useAuthStore } from '../../store/authStore';
import { useMatchRealtime } from '../../api/realtime/useMatchRealtime';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { colors, radius, shadows, spacing } from '../../theme';

const sg = createInFlightGuard();
const cg = createInFlightGuard();
const xg = createInFlightGuard();

export default function MatchScreen() {
  const { id, friendlyId } = useLocalSearchParams<{ id: string; friendlyId?: string }>();
  const session = useAuthStore((s) => s.user);
  const me = session?.playerProfile?.id || session?.id || '';
  const queryClient = useQueryClient();
  const friendly = Boolean(friendlyId);
  const fq = useQuery({
    queryKey: ['friendly-match', id],
    queryFn: () => friendlyApi.detail(friendlyId!),
    enabled: friendly,
  });
  const fp = useQuery({
    queryKey: ['friendly-match-participants', friendlyId],
    queryFn: () => friendlyApi.participants(friendlyId!),
    enabled: friendly,
  });
  const ft = useQuery({
    queryKey: ['friendly-match-teams', friendlyId],
    queryFn: () => friendlyApi.teams(friendlyId!),
    enabled: friendly,
  });
  const ff = useQuery({
    queryKey: ['friendly-match-fixtures', friendlyId],
    queryFn: () => friendlyApi.fixtures(friendlyId!),
    enabled: friendly,
  });
  const q = useQuery({
    queryKey: ['match', id],
    queryFn: () => scoringApi.match(id),
    enabled: !friendly,
  });
  const match: any = friendly
    ? (ff.data?.matches || []).find((item: any) => String(item.id) === String(id))
    : q.data;
  const role = session?.role || '';
  const owner = friendly
    ? friendlyIsOwner(fq.data, me)
    : role === 'ADMIN' ||
      (role === 'ORGANIZER' &&
        String(match?.organizer_id || match?.organizerId || '') === String(session?.id || me));
  const initialTarget =
    match?.winningPoints ?? match?.winning_points ?? match?.targetPoints ?? match?.target_points;
  const [target, setTarget] = useState<number | undefined>(
    initialTarget == null ? undefined : Number(initialTarget),
  );
  useEffect(() => {
    if (match) {
      const value =
        match.winningPoints ?? match.winning_points ?? match.targetPoints ?? match.target_points;
      setTarget(value == null ? undefined : Number(value));
    }
  }, [match]);
  const refetch = () => friendly ? Promise.all([fq.refetch(), fp.refetch(), ft.refetch(), ff.refetch()]) : q.refetch();
  useMatchRealtime(id, refetch);
  const start = useMutation({
    mutationFn: () =>
      friendly
        ? friendlyScoringApi.start(friendlyId!, id, target || 0)
        : scoringApi.start(id, { requestedByUserId: session?.id, winningPoints: target }),
    onSuccess: refetch,
  });
  const applyScoreResponse = (updated: any) => {
    if (!updated) return;
    if (friendly) {
      queryClient.setQueryData(['friendly-match-fixtures', friendlyId], (current: any) => {
        if (!current?.matches) return current;
        return {
          ...current,
          matches: current.matches.map((item: any) =>
            String(item.id) === String(id) ? { ...item, ...updated } : item,
          ),
        };
      });
    } else {
      queryClient.setQueryData(['match', id], updated);
    }
  };
  const score = useMutation({
    mutationFn: (value: { side: 'A' | 'B'; action: 'INCREMENT' | 'DECREMENT' }) =>
      friendly
        ? friendlyScoringApi.score(friendlyId!, id, value.side, value.action)
        : scoringApi.score(id, { ...value, requestedByUserId: session?.id }),
    onSuccess: (updated) => {
      applyScoreResponse(updated);
      // Keep the response-driven UI mounted and reconcile in the background.
      void refetch();
    },
  });
  const complete = useMutation({
    mutationFn: () =>
      friendly
        ? friendlyScoringApi.complete(friendlyId!, id)
        : scoringApi.complete(id, { requestedByUserId: session?.id }),
    onSuccess: async () => {
      await refetch();
      if (friendly) {
        await queryClient.invalidateQueries({ queryKey: ['friendly-match-fixtures', friendlyId] });
        router.replace({ pathname: '/(player)/friendly/fixtures', params: { id: friendlyId! } });
      }
    },
  });
  if (!match && (q.isError || fq.isError))
    return (
      <ScreenContainer dark>
        <Text style={s.error}>Unable to load match</Text>
        <PrimaryButton title="Retry" onPress={refetch} />
        <PrimaryButton title="Back to fixtures" onPress={() => router.back()} />
      </ScreenContainer>
    );
  if (!match)
    return (
      <ScreenContainer dark>
        <Text style={s.loading}>Loading match…</Text>
      </ScreenContainer>
    );
  const a = match.participant1Score ?? match.participant1_score ?? match.scoreA ?? 0;
  const b = match.participant2Score ?? match.participant2_score ?? match.scoreB ?? 0;
  const status = String(match.status || 'SCHEDULED').toUpperCase();
  const actions =
    target == null
      ? {
          ...scoringActions({ authorized: owner, status, scoreA: a, scoreB: b, target: 0 }),
          canComplete: false,
        }
      : scoringActions({ authorized: owner, status, scoreA: a, scoreB: b, target });
  const begin = () => {
    if (!actions.canStart || target == null || start.isPending || !cg.tryStart()) return;
    Alert.alert('Start Match?', 'Begin this match.', [
      { text: 'Cancel', onPress: () => cg.release() },
      { text: 'Start', onPress: () => start.mutate(undefined, { onSettled: () => cg.release() }) },
    ]);
  };
  const change = (side: 'A' | 'B', action: 'INCREMENT' | 'DECREMENT') => {
    const allowed = action === 'DECREMENT' ? actions.canDecrement(side) : actions.canIncrement;
    if (!allowed || score.isPending || !sg.tryStart()) return;
    score.mutate({ side, action }, { onSettled: () => sg.release() });
  };
  const finish = () => {
    if (!actions.canComplete || complete.isPending || !xg.tryStart()) return;
    Alert.alert('Complete Match?', `Confirm ${a}-${b}.`, [
      { text: 'Cancel', onPress: () => xg.release() },
      {
        text: 'Complete',
        onPress: () => complete.mutate(undefined, { onSettled: () => xg.release() }),
      },
    ]);
  };
  return (
    <ScreenContainer dark>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            tintColor={colors.lime}
            refreshing={q.isFetching || fq.isFetching}
            onRefresh={refetch}
          />
        }
        contentContainerStyle={s.content}
      >
        <Text onPress={() => router.back()} style={s.back}>
          ‹ Live Match
        </Text>
        <Text style={s.eyebrow}>ORGANIZER MATCH</Text>
        {(match.tournamentName || match.categoryName) && (
          <Text style={s.context}>
            {[match.tournamentName, match.categoryName].filter(Boolean).join(' · ')}
          </Text>
        )}
        <View style={s.header}>
          <Text style={s.matchCode}>
            Match {match.matchCode || match.match_code || match.code || match.id}
          </Text>
          <Text style={[s.status, statusStyle(status)]}>{status}</Text>
        </View>
        <View style={s.card}>
          <Participant
            label="Participant 1"
            name={
              (friendly ? resolveFriendlySide({ id: match.participant1_id, type: match.participant1_type }, fp.data || [], ft.data || []) : null) ||
              match.participant1Name ||
              match.participant1_name ||
              match.player1Name ||
              match.team1Name ||
              displayValue(match.participant1)
            }
            code={
              match.participant1Code ||
              match.participant1_code ||
              match.player1Code ||
              match.team1Code
            }
            score={a}
            live={actions.canIncrement}
            onMinus={() => change('A', 'DECREMENT')}
            onPlus={() => change('A', 'INCREMENT')}
            // `change()` already guards duplicate taps. Keep the control
            // mounted and visually stable while the score request is pending.
            disabled={false}
          />
          <Text style={s.vs}>VS</Text>
          <Participant
            label="Participant 2"
            name={
              (friendly ? resolveFriendlySide({ id: match.participant2_id, type: match.participant2_type }, fp.data || [], ft.data || []) : null) ||
              match.participant2Name ||
              match.participant2_name ||
              match.player2Name ||
              match.team2Name ||
              displayValue(match.participant2)
            }
            code={
              match.participant2Code ||
              match.participant2_code ||
              match.player2Code ||
              match.team2Code
            }
            score={b}
            live={actions.canIncrement}
            onMinus={() => change('B', 'DECREMENT')}
            onPlus={() => change('B', 'INCREMENT')}
            disabled={false}
          />
          {actions.canStart && (
            <>
              <Text style={s.selectorLabel}>Winning points</Text>
              <View style={s.targets}>
                {[15, 21, 30].map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setTarget(value)}
                    style={[s.target, target === value && s.targetSelected]}
                  >
                    <Text style={[s.targetText, target === value && s.targetTextSelected]}>
                      {target === value ? '✓ ' : ''}
                      {value}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <PrimaryButton
                disabled={start.isPending || target == null}
                title={start.isPending ? 'Starting…' : 'Start Match'}
                onPress={begin}
              />
            </>
          )}
          {status === 'LIVE' && target != null && (
            <Text style={s.rule}>Playing to {target} · Win by 2</Text>
          )}
          {actions.canComplete && (
            <PrimaryButton
              disabled={complete.isPending}
              title={complete.isPending ? 'Completing…' : 'Complete Match'}
              onPress={finish}
            />
          )}
          {(match.winnerParticipantName || match.winner_participant_name || match.winnerName) &&
            status === 'COMPLETED' && (
              <Text style={s.winner}>
                🏆 Winner:{' '}
                {match.winnerParticipantName || match.winner_participant_name || match.winnerName}
              </Text>
            )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function Participant({
  label,
  name,
  code,
  score,
  live,
  onMinus,
  onPlus,
  disabled,
}: {
  label: string;
  name: unknown;
  code?: unknown;
  score: number;
  live: boolean;
  onMinus: () => void;
  onPlus: () => void;
  disabled: boolean;
}) {
  return (
    <View style={s.participant}>
      <Text style={s.label}>{label}</Text>
      <View style={s.playerRow}>
        <View style={s.playerCopy}>
          <Text style={s.name}>{displayValue(name)}</Text>
          {code != null && <Text style={s.code}>{String(code)}</Text>}
        </View>
        <Text style={s.score}>{score}</Text>
      </View>
      {live && (
        <View style={s.scoreControls}>
          <PrimaryButton disabled={disabled || score <= 0} title="- Point" onPress={onMinus} />
          <PrimaryButton disabled={disabled} title="+ Point" onPress={onPlus} />
        </View>
      )}
    </View>
  );
}
function displayValue(value: any) {
  if (value == null || value === '') return 'TBD';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return (
    value.name || value.fullName || value.displayName || value.teamName || value.playerName || 'TBD'
  );
}
function statusStyle(status: string) {
  if (status === 'LIVE') return { backgroundColor: '#D7F6E7', color: colors.sport };
  if (status === 'COMPLETED') return { backgroundColor: '#E3EEF8', color: colors.info };
  return { backgroundColor: '#FFF0D8', color: '#A86A0A' };
}
const s = StyleSheet.create({
  content: { paddingBottom: 44 },
  loading: { color: colors.white, marginTop: spacing.section, fontSize: 20 },
  error: { color: colors.white, fontSize: 18, marginBottom: spacing.md },
  back: { color: colors.lime, fontWeight: '900', marginTop: spacing.md },
  eyebrow: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginTop: spacing.sm,
  },
  context: { color: colors.muted, marginTop: spacing.xs },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  matchCode: { color: colors.white, fontSize: 21, fontWeight: '900', flex: 1 },
  status: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 10,
    fontWeight: '900',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    ...shadows.card,
  },
  participant: { paddingVertical: spacing.sm },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  playerCopy: { flex: 1, paddingRight: spacing.md },
  name: { color: colors.text, fontSize: 18, fontWeight: '900' },
  code: { color: colors.muted, fontSize: 12, marginTop: 3 },
  score: { color: colors.primary, fontSize: 28, fontWeight: '900' },
  scoreControls: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  vs: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  selectorLabel: { color: colors.text, fontSize: 14, fontWeight: '900', marginTop: spacing.lg },
  targets: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md },
  target: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.small,
    minWidth: 64,
    paddingVertical: 12,
    alignItems: 'center',
  },
  targetSelected: { backgroundColor: colors.lime, borderColor: colors.lime },
  targetText: { color: colors.text, fontWeight: '900' },
  targetTextSelected: { color: colors.primaryDark },
  rule: { color: colors.muted, textAlign: 'center', marginVertical: spacing.md },
  winner: { color: colors.primary, fontWeight: '900', textAlign: 'center', marginTop: spacing.md },
});
