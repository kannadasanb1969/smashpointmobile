import { Alert, ImageBackground, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scoringApi, scoringActions } from '../player/scoring';
import { organizerApi } from '../organizer/api';
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
import { BackButton } from '../../components/common/BackButton';
import { TournamentIcon } from '../../components/common/TournamentIcon';
import { colors, radius, spacing } from '../../theme';

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
  const tq = useQuery({
    queryKey: ['tournament', match?.tournamentId],
    queryFn: () => organizerApi.detail(match.tournamentId),
    enabled: !friendly && Boolean(match?.tournamentId),
  });
  const role = session?.role || '';
  const owner = friendly
    ? friendlyIsOwner(fq.data, me)
    : role === 'ADMIN' ||
      (role === 'ORGANIZER' &&
        String(tq.data?.organizerId || tq.data?.organizer_id || '') === String(session?.id || me));
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
        <Pressable style={s.ctaButton} onPress={refetch}><Text style={s.ctaButtonText}>Retry</Text></Pressable>
        <Pressable style={s.ctaButton} onPress={() => router.back()}><Text style={s.ctaButtonText}>Back to fixtures</Text></Pressable>
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
  const metadata = [category, pool].filter(Boolean);
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
        style={s.scroll}
        refreshControl={
          <RefreshControl
            tintColor={colors.lime}
            refreshing={q.isFetching || fq.isFetching}
            onRefresh={refetch}
          />
        }
        contentContainerStyle={s.content}
      >
        <ImageBackground
          source={require('../../../assets/images/login-badminton-bg.png')}
          style={s.hero}
          imageStyle={s.heroImage}
        >
          <View style={s.heroOverlay} />
          <View style={s.heroTopRow}>
            <View style={s.heroCopy}>
              <View style={s.backRow}>
                <BackButton variant="dark" />
                <Text style={s.backLabel}>Live Match</Text>
              </View>
              <Text style={s.eyebrow}>ORGANIZER MATCH</Text>
              <View style={s.header}>
                <Text style={s.matchCode}>
                  Match {match.matchCode || match.match_code || match.code || match.id}
                </Text>
                {status === 'LIVE' && <Text style={s.liveBadge}>● LIVE</Text>}
              </View>
              {round ? <Text style={s.round}>Round {round}</Text> : null}
              {!!metadata.length && (
                <View style={s.metadata}>
                  {metadata.map((item, index) => (
                    <Text key={`${item}-${index}`} style={s.metadataText}>
                      {index > 0 ? '  |  ' : ''}{item}
                    </Text>
                  ))}
                </View>
              )}
            </View>
            <View style={s.moreBlock}>
              <Text style={s.moreText}>PLAY</Text>
              <Text style={s.moreText}>COMPETE</Text>
              <Text style={s.moreText}>BELONG</Text>
            </View>
          </View>
          <Pressable accessibilityLabel="Match menu" style={s.menuButton}>
            <TournamentIcon name="menu" size={18} />
          </Pressable>
          <View style={s.heroFade} />
        </ImageBackground>
        <View style={s.body}>
          <View style={s.scoreShell}>
            {target != null && (
              <View style={s.playingToPill}>
                <Text style={s.playingTo}>PLAYING TO {target}  •  WIN BY 2</Text>
              </View>
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
              accent="lime"
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
              accent="teal"
            />
            {actions.canStart && (
              <>
                <View style={s.selectorHeader}>
                  <TournamentIcon name="trophy" size={18} />
                  <Text style={s.selectorLabel}>Winning points</Text>
                </View>
                <Text style={s.selectorHelper}>Select the target points for this match</Text>
                <View style={s.targets}>
                  {[15, 21, 30].map((value) => (
                    <Pressable
                      key={value}
                      onPress={() => setTarget(value)}
                      style={[s.target, target === value && s.targetSelected]}
                    >
                      {target === value && <TournamentIcon name="check" size={13} />}
                      <Text style={[s.targetText, target === value && s.targetTextSelected]}>
                        {value}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  disabled={start.isPending || target == null}
                  onPress={begin}
                  style={[s.startButton, (start.isPending || target == null) && s.disabledButton]}
                >
                  <TournamentIcon name="play" size={16} />
                  <Text style={s.startButtonText}>{start.isPending ? 'Starting…' : 'Start Match'}</Text>
                </Pressable>
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
          {!friendly && (
            <View style={s.infoCard}>
              <View style={s.infoIconBox}>
                <TournamentIcon name="info" size={20} />
              </View>
              <View style={s.infoCopy}>
                <Text style={s.infoTitle}>Match Info</Text>
                <Text style={s.infoText}>
                  This is an organizer match. Start the match when both teams are ready.
                </Text>
              </View>
            </View>
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
  accent,
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
  accent: 'lime' | 'teal';
}) {
  return (
    <View style={[s.participant, leading && s.leadingParticipant]}>
      <View style={[s.accentStrip, accent === 'lime' ? s.accentLime : s.accentTeal]} />
      <View style={s.participantInner}>
        <View style={s.participantTop}>
          <Text style={s.label}>{label.toUpperCase()}</Text>
          <View style={s.badges}>
            {leading && <Text style={s.leadingBadge}>♛ LEADING</Text>}
            <Text style={s.typeBadge}>{isDoubles ? 'TEAM' : 'PLAYER'}</Text>
          </View>
        </View>
        <View style={s.playerRow}>
          <View style={s.iconCircle}>
            <TournamentIcon name={isDoubles ? 'people' : 'single'} size={22} />
          </View>
          <View style={s.playerCopy}>
            {displayNames(name).map((item, index) => <Text key={`${item}-${index}`} style={s.name}>{item}</Text>)}
            {code != null && <Text style={s.code}>{String(code)}</Text>}
          </View>
          <View style={s.scoreBox}>
            <Text style={[s.score, leading && s.leadingScore]}>{String(score).padStart(2, '0')}</Text>
          </View>
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
const s = StyleSheet.create({
  scroll: { backgroundColor: '#031A16' },
  content: { paddingBottom: 44 },
  loading: { color: colors.white, marginTop: spacing.section, fontSize: 20, marginHorizontal: spacing.lg },
  error: { color: colors.white, fontSize: 18, marginBottom: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.lg },
  ctaButton: { backgroundColor: colors.primary, borderRadius: radius.medium, padding: spacing.lg, alignItems: 'center', marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  ctaButtonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  hero: { minHeight: 210, paddingTop: 8 },
  heroImage: { resizeMode: 'cover' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2, 27, 21, 0.66)' },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: -1, height: 26, backgroundColor: '#031A16' },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6 },
  heroCopy: { flexShrink: 1 },
  moreBlock: { alignItems: 'flex-end', paddingTop: 30 },
  moreText: { color: '#CFE0D8', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textAlign: 'right' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  backLabel: { color: colors.lime, fontWeight: '900', fontSize: 14 },
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
    marginTop: 6,
    gap: 10,
  },
  matchCode: { color: colors.white, fontSize: 21, fontWeight: '900' },
  liveBadge: { color: '#FF6B63', backgroundColor: '#321D1E', borderColor: '#A94B4B', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 6, fontSize: 10, fontWeight: '900' },
  round: { color: '#9FB6AC', fontSize: 13, marginTop: 4 },
  menuButton: {
    position: 'absolute',
    right: 20,
    top: 118,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2E6C56',
    backgroundColor: 'rgba(6, 45, 36, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs },
  metadataText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  body: { paddingHorizontal: 20 },
  scoreShell: {
    backgroundColor: 'rgba(6, 45, 36, 0.9)',
    borderColor: '#17614B',
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginTop: -30,
  },
  playingToPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(18, 76, 64, 0.6)',
    borderColor: '#2E8064',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: spacing.lg,
  },
  playingTo: { color: colors.lime, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  participant: {
    flexDirection: 'row',
    backgroundColor: '#083127',
    borderColor: '#17614B',
    borderWidth: 1,
    borderRadius: radius.lg,
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },
  leadingParticipant: { borderColor: colors.lime, borderWidth: 1.5 },
  accentStrip: { width: 5 },
  accentLime: { backgroundColor: colors.lime },
  accentTeal: { backgroundColor: '#2FD3C9' },
  participantInner: { flex: 1, padding: spacing.md },
  leadingScore: { color: colors.lime },
  disabledButton: { opacity: 0.35 },
  minusButton: { flex: 1, minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: '#2E6C56', backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  plusButton: { flex: 1, minHeight: 48, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  minusText: { color: colors.white, fontSize: 26, fontWeight: '700' },
  plusText: { color: colors.white, fontSize: 26, fontWeight: '800' },
  completeButton: { minHeight: 52, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.lime, backgroundColor: '#0B3A2D', alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  completeText: { color: colors.lime, fontSize: 15, fontWeight: '900' },
  participantTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badges: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  leadingBadge: { color: '#0B3324', backgroundColor: colors.lime, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 5, fontSize: 9, fontWeight: '900' },
  typeBadge: { color: '#A8DCD0', backgroundColor: 'rgba(18, 76, 64, 0.9)', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 5, fontSize: 9, fontWeight: '900' },
  label: {
    color: '#7FA396',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(138, 226, 52, 0.14)',
    borderWidth: 1,
    borderColor: '#2E6C56',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  playerCopy: { flex: 1, minWidth: 0 },
  name: { color: colors.white, fontSize: 17, lineHeight: 22, fontWeight: '900' },
  code: { color: '#7FA396', fontSize: 12, marginTop: 3 },
  scoreBox: {
    minWidth: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#2E6C56',
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  score: { color: colors.white, fontSize: 34, lineHeight: 38, fontWeight: '900', textAlign: 'center' },
  scoreControls: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  vsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.sm },
  vsLine: { flex: 1, height: 1, backgroundColor: '#2F6657' },
  vs: {
    color: colors.lime,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  selectorHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.lg },
  selectorLabel: { color: colors.white, fontSize: 15, fontWeight: '900' },
  selectorHelper: { color: '#8FA59B', fontSize: 12, marginTop: 4 },
  targets: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md },
  target: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    borderColor: '#2E6C56',
    borderWidth: 1,
    borderRadius: radius.medium,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetSelected: { backgroundColor: colors.lime, borderColor: colors.lime },
  targetText: { color: '#A8B6B1', fontWeight: '900', fontSize: 15 },
  targetTextSelected: { color: '#0B3324' },
  startButton: {
    flexDirection: 'row',
    gap: 10,
    minHeight: 56,
    borderRadius: radius.medium,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    shadowColor: colors.lime,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  startButtonText: { color: colors.white, fontSize: 17, fontWeight: '900' },
  rule: { color: colors.muted, textAlign: 'center', marginVertical: spacing.md },
  winner: { color: colors.lime, fontWeight: '900', textAlign: 'center', marginTop: spacing.md },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: 'rgba(6, 45, 36, 0.7)',
    borderColor: '#17614B',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoCopy: { flex: 1 },
  infoTitle: { color: colors.white, fontSize: 15, fontWeight: '900' },
  infoText: { color: '#9FB6AC', fontSize: 12, lineHeight: 18, marginTop: 4 },
});
