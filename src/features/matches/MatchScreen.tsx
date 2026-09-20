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
  const category = match.categoryName || match.category_name || match.eventType || match.event_type;
  const pool = match.poolName || match.pool_name || match.groupName || match.group_name;
  const round = match.roundName || match.round_name || match.roundNumber || match.round_number;
  const metadata = [category, pool, round ? `Round ${round}` : null].filter(Boolean);
  const isDoubles = String(match.participant1_type || match.participant1Type || '').toUpperCase() === 'TEAM' ||
    String(match.participant2_type || match.participant2Type || '').toUpperCase() === 'TEAM';
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
        <View style={s.header}>
          <Text style={s.matchCode}>
            Match {match.matchCode || match.match_code || match.code || match.id}
          </Text>
          {status === 'LIVE' && <Text style={s.liveBadge}>● LIVE</Text>}
          <View style={s.menuButton}><Text style={s.menuDots}>⋮</Text></View>
        </View>
        {!!metadata.length && (
          <View style={s.metadata}>
            {metadata.map((item, index) => (
              <Text key={`${item}-${index}`} style={s.metadataText}>
                {index > 0 ? '  |  ' : ''}{item}
              </Text>
            ))}
          </View>
        )}
        <View style={s.scoreShell}>
          {target != null && (
            <Text style={s.playingTo}>PLAYING TO {target}  •  WIN BY 2</Text>
          )}
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
            disabled={false}
            leading={a > b}
            isDoubles={isDoubles}
          />
          <View style={s.vsRow}><View style={s.vsLine} /><Text style={s.vs}>VS</Text><View style={s.vsLine} /></View>
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
            leading={b > a}
            isDoubles={isDoubles}
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
            <Pressable
              disabled={complete.isPending}
              onPress={finish}
              style={[s.completeButton, complete.isPending && s.disabledButton]}
            >
              <Text style={s.completeText}>{complete.isPending ? 'Completing…' : '✓  Complete Match'}</Text>
            </Pressable>
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
  leading,
  isDoubles,
}: {
  label: string;
  name: unknown;
  code?: unknown;
  score: number;
  live: boolean;
  onMinus: () => void;
  onPlus: () => void;
  disabled: boolean;
  leading: boolean;
  isDoubles: boolean;
}) {
  return (
    <View style={[s.participant, leading && s.leadingParticipant]}>
      <View style={s.participantTop}>
        <Text style={s.label}>{label}</Text>
        <View style={s.badges}>
          {leading && <Text style={s.leadingBadge}>♛ LEADING</Text>}
          <Text style={s.typeBadge}>{isDoubles ? 'TEAM' : 'PLAYER'}</Text>
        </View>
      </View>
      <View style={s.playerRow}>
        <View style={s.playerCopy}>
          {displayNames(name).map((item, index) => <Text key={`${item}-${index}`} style={s.name}>{item}</Text>)}
          {code != null && <Text style={s.code}>{String(code)}</Text>}
        </View>
        <Text style={[s.score, leading && s.leadingScore]}>{String(score).padStart(2, '0')}</Text>
      </View>
      {live && (
        <View style={s.scoreControls}>
          <Pressable disabled={disabled || score <= 0} style={[s.minusButton, (disabled || score <= 0) && s.disabledButton]} onPress={onMinus}>
            <Text style={s.minusText}>−</Text>
          </Pressable>
          <Pressable disabled={disabled} style={[s.plusButton, disabled && s.disabledButton]} onPress={onPlus}>
            <Text style={s.plusText}>+</Text>
          </Pressable>
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
function displayNames(value: any): string[] {
  const text = displayValue(value);
  return text.includes(' / ') ? text.split(' / ').filter(Boolean) : [text];
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  matchCode: { color: colors.white, fontSize: 21, fontWeight: '900', flex: 1 },
  liveBadge: { color: '#FF6B63', backgroundColor: '#321D1E', borderColor: '#A94B4B', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 6, fontSize: 10, fontWeight: '900' },
  menuButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.xs },
  menuDots: { color: colors.primaryDark, fontSize: 24, lineHeight: 26, fontWeight: '900' },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm },
  metadataText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  scoreShell: {
    backgroundColor: '#062D24',
    borderColor: '#17614B',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  playingTo: { color: colors.lime, fontSize: 12, fontWeight: '900', textAlign: 'center', marginBottom: spacing.sm },
  leadingParticipant: { borderColor: colors.lime, borderWidth: 2, borderRadius: radius.md, paddingHorizontal: spacing.sm },
  leadingScore: { color: colors.primary },
  disabledButton: { opacity: 0.35 },
  minusButton: { flex: 1, minHeight: 54, borderRadius: radius.md, borderWidth: 1, borderColor: '#C7D9CE', backgroundColor: '#EEF5F0', alignItems: 'center', justifyContent: 'center' },
  plusButton: { flex: 1, minHeight: 54, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  minusText: { color: colors.primaryDark, fontSize: 30, fontWeight: '700' },
  plusText: { color: colors.white, fontSize: 30, fontWeight: '800' },
  completeButton: { minHeight: 52, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.lime, backgroundColor: '#0B3A2D', alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  completeText: { color: colors.lime, fontSize: 15, fontWeight: '900' },
  card: { backgroundColor: colors.surface },
  participant: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, marginVertical: spacing.xs, ...shadows.card },
  participantTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badges: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  leadingBadge: { color: colors.primaryDark, backgroundColor: '#DDF4C9', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 5, fontSize: 9, fontWeight: '900' },
  typeBadge: { color: colors.primaryDark, backgroundColor: '#EAF6EE', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 5, fontSize: 9, fontWeight: '900' },
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
  name: { color: '#15382C', fontSize: 18, lineHeight: 23, fontWeight: '900' },
  code: { color: colors.muted, fontSize: 12, marginTop: 5 },
  score: { color: '#15382C', fontSize: 76, lineHeight: 82, fontWeight: '900', textAlign: 'center' },
  scoreControls: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  vsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.sm },
  vsLine: { flex: 1, height: 1, backgroundColor: '#2F6657' },
  vs: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
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
