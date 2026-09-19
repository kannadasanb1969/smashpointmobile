import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../src/store/authStore';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { PrimaryButton } from '../../../src/components/common/PrimaryButton';
import { colors, radius, shadows, spacing } from '../../../src/theme';
import {
  friendlyApi,
  friendlyKeys,
  useFriendlyDetail,
  useFriendlyParticipants,
  friendlyIsOwner,
  friendlyPairingReady,
  resolveFriendlySide,
  createInFlightGuard,
} from '../../../src/features/player/friendly';

type Filter = 'ALL' | 'LIVE' | 'UPCOMING' | 'COMPLETED';
type FixtureView = 'BRACKET' | 'ROUND';
const statusOf = (m: any) => String(m.status || 'SCHEDULED').toUpperCase();
const roundOf = (m: any) => m.round_number ?? m.roundNumber ?? m.round ?? m.stage ?? 1;
const matchNo = (m: any, index: number) => m.match_number ?? m.matchNumber ?? m.match_order ?? index + 1;
const isTbd = (value: string) => value === 'TBD';
const label = (status: string) =>
  status === 'IN_PROGRESS' || status === 'LIVE'
    ? 'LIVE'
    : status === 'COMPLETED'
      ? 'COMPLETED'
      : status === 'BYE'
        ? 'BYE'
        : 'UPCOMING';
const fixtureRows = (payload: any): any[] =>
  Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.matches)
      ? payload.matches
      : Array.isArray(payload?.data?.matches)
        ? payload.data.matches
        : Array.isArray(payload?.fixtures)
          ? payload.fixtures
          : [];
// Round-1-only rule derived from the backend's own bracket builder (buildKnockoutBracket in
// friendly-fixtures.js): byes are seeded exclusively into round 1 (byeParticipant is only ever set
// there), and a round-1 slot with exactly one participant never gets a second one assigned later —
// unlike round >=2 matches, where a null participant is a genuine pending TBD waiting on a source match.
const isByeSlot = (m: any, side: 1 | 2) => {
  const round = Number(roundOf(m));
  const p1 = m.participant1_id ?? m.participant1?.id;
  const p2 = m.participant2_id ?? m.participant2?.id;
  return round === 1 && Boolean(p1) !== Boolean(p2) && !(side === 1 ? p1 : p2);
};
const isResolvedBye = (m: any) => statusOf(m) === 'COMPLETED' && Boolean(m.winner_id || m.winnerId) &&
  m.participant1_score == null && m.participant2_score == null &&
  Boolean(m.participant1_id) !== Boolean(m.participant2_id);

export default function Fixtures() {
  const { id, focusMatchId } = useLocalSearchParams<{ id: string; focusMatchId?: string }>();
  const [tab, setTab] = useState<'FIXTURES' | 'MATCHES'>(focusMatchId ? 'MATCHES' : 'FIXTURES');
  const [fixtureView, setFixtureView] = useState<FixtureView>('BRACKET');
  const [filter, setFilter] = useState<Filter>('ALL');
  const me = useAuthStore((s) => s.user?.playerProfile?.id || s.user?.id) || '';
  const detail = useFriendlyDetail(id);
  const participants = useFriendlyParticipants(id);
  const client = useQueryClient();
  const teams = useQuery({
    queryKey: friendlyKeys.teams(id),
    queryFn: () => friendlyApi.teams(id),
    enabled: !!id,
  });
  // Fixtures is the PRIMARY query for this screen: its loading/error state alone drives what
  // renders below the tabs. Teams/participants are enrichment only (real-name resolution) — if
  // either of those queries fails, `side()` below just falls back to 'TBD' for that one card
  // instead of taking down the whole screen with an unrelated "Unable to load fixtures".
  const query = useQuery({
    queryKey: friendlyKeys.fixtures(id),
    queryFn: () => friendlyApi.fixtures(id),
    enabled: !!id,
  });
  const owner = friendlyIsOwner(detail.data, me);
  const guard = createInFlightGuard();
  const reset = useMutation({
    mutationFn: () => friendlyApi.resetFixtures(id),
    onSuccess: () =>
      void Promise.all([
        query.refetch(),
        detail.refetch(),
        teams.refetch(),
        client.invalidateQueries({ queryKey: friendlyKeys.all }),
      ]),
    onError: (e: any) => Alert.alert('Unable to reset fixtures', e?.message || 'Please try again.'),
  });
  const generate = useMutation({
    mutationFn: () => friendlyApi.generateFixtures(id),
    onSuccess: () => void Promise.all([query.refetch(), detail.refetch(), teams.refetch()]),
    onError: (e: any) => Alert.alert('Unable to generate fixtures', e?.message || 'Please try again.'),
  });
  const data = fixtureRows(query.data);
  const roundKeys = Array.from(new Set(data.map((m) => String(roundOf(m)))));
  const rounds = roundKeys
    .map((round) => ({ round, matches: data.filter((m) => String(roundOf(m)) === round) }))
    .sort((a, b) => Number(a.round) - Number(b.round));
  const playable = (m: any) => !isTbd(side(m, 1)) && !isTbd(side(m, 2)) && statusOf(m) !== 'BYE';
  const resetNow = () => {
    if (!owner || reset.isPending || !guard.tryStart()) return;
    Alert.alert(
      'Reset fixtures?',
      'This clears the current bracket so pairings can be adjusted.',
      [
        { text: 'Cancel', onPress: () => guard.release() },
        { text: 'Reset', style: 'destructive', onPress: () => reset.mutate(undefined, { onSettled: () => guard.release() }) },
      ],
    );
  };
  const refresh = () => void Promise.all([query.refetch(), detail.refetch(), participants.refetch(), teams.refetch()]);
  // Must route under (player)/, not (organizer)/ — the root layout's workspace guard
  // (app/_layout.tsx) redirects any PLAYER-workspace user off every (organizer)/* route before
  // it renders, so this previously bounced every tap straight back to Home for every player.
  const openMatch = (m: any) => router.push({ pathname: '/(player)/friendly/match/[id]', params: { id: String(m.id), friendlyId: String(id) } });
  const goToMatch = (m: any) => {
    setTab('MATCHES');
    setFilter('ALL');
    openMatch(m);
  };
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={refresh} />}>
        <Header
          onBack={() => router.back()}
          onMenu={() =>
            owner
              ? Alert.alert('Fixture actions', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Reset Fixtures', style: 'destructive', onPress: resetNow },
                ])
              : undefined
          }
        />
        <Text style={s.title}>{detail.data?.title || 'Fixtures'}</Text>
        <Text style={s.meta}>
          {detail.data?.event_type || 'MATCH'} · {detail.data?.format || ''}
        </Text>
        <View style={s.tabs}>
          <Tab active={tab === 'FIXTURES'} title="Fixtures" onPress={() => setTab('FIXTURES')} />
          <Tab active={tab === 'MATCHES'} title="Matches" onPress={() => setTab('MATCHES')} />
        </View>

        {query.isLoading && (
          <View style={s.state}>
            <Text style={s.muted}>Loading fixtures…</Text>
          </View>
        )}
        {query.isError && !data.length && (
          <View style={s.errorCard}>
            <Text style={s.errorTitle}>Unable to load fixtures</Text>
            <Text style={s.muted}>{(query.error as any)?.message || 'The fixture data could not be retrieved.'}</Text>
            <PrimaryButton title="Retry" onPress={() => query.refetch()} />
          </View>
        )}
        {!query.isLoading && !query.isError && !data.length && (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No fixtures generated yet.</Text>
            {owner && friendlyPairingReady(detail.data, participants.data || [], teams.data || []) && (
              <PrimaryButton
                disabled={generate.isPending}
                title={generate.isPending ? 'Generating…' : 'Generate Fixtures'}
                onPress={() => generate.mutate()}
              />
            )}
          </View>
        )}

        {!!data.length && tab === 'FIXTURES' && (
          <>
            <View style={s.viewSwitch}>
              <SwitchTab active={fixtureView === 'BRACKET'} title="Bracket View" onPress={() => setFixtureView('BRACKET')} />
              <SwitchTab active={fixtureView === 'ROUND'} title="Round View" onPress={() => setFixtureView('ROUND')} />
            </View>
            {fixtureView === 'BRACKET' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.bracketScroll}>
                <View style={s.bracket}>
                  {rounds.map((r, ri) => (
                    <View key={r.round} style={s.roundBlock}>
                      <View style={s.roundHeader}>
                        <Text style={s.roundName}>{formatRound(r.round, ri, rounds.length)}</Text>
                        <Text style={s.roundCount}>
                          {r.matches.length} {r.matches.length === 1 ? 'Match' : 'Matches'}
                        </Text>
                      </View>
                      <View style={s.column}>
                        {pairUp(r.matches).map((pair, pi) => (
                          <View key={pi} style={s.pairSlot}>
                            <View style={s.pairCards}>
                              {pair.map((m, i) =>
                                m ? (
                                  <FixtureCard key={m.id} match={m} index={r.matches.indexOf(m)} last={ri === rounds.length - 1} onPress={() => goToMatch(m)} />
                                ) : (
                                  <View key={i} style={s.fixturePlaceholder} />
                                ),
                              )}
                            </View>
                            {ri < rounds.length - 1 && pair.length === 2 && pair[0] && pair[1] && <View style={s.connector} />}
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <View style={s.roundView}>
                {rounds.map((r, ri) => (
                  <View key={r.round} style={s.roundGroup}>
                    <Text style={s.roundViewTitle}>{formatRound(r.round, ri, rounds.length).toUpperCase()}</Text>
                    {r.matches.map((m, i) => (
                      <RoundRow key={m.id || i} match={m} index={i} onPress={() => goToMatch(m)} />
                    ))}
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {!!data.length && tab === 'MATCHES' && (
          <>
            <View style={s.filters}>
              {(['ALL', 'LIVE', 'UPCOMING', 'COMPLETED'] as Filter[]).map((x) => (
                <Pressable key={x} onPress={() => setFilter(x)} style={[s.filter, filter === x && s.filterActive]}>
                  <Text style={[s.filterText, filter === x && s.filterTextActive]}>
                    {x === 'ALL'
                      ? `ALL (${data.length})`
                      : `${x} (${
                          data.filter((m) =>
                            x === 'LIVE'
                              ? statusOf(m) === 'LIVE' || statusOf(m) === 'IN_PROGRESS'
                              : x === 'UPCOMING'
                                ? statusOf(m) === 'SCHEDULED'
                                : statusOf(m) === x,
                          ).length
                        })`}
                  </Text>
                </Pressable>
              ))}
            </View>
            {data
              .filter(
                (m) =>
                  filter === 'ALL' ||
                  (filter === 'LIVE'
                    ? statusOf(m) === 'LIVE' || statusOf(m) === 'IN_PROGRESS'
                    : filter === 'UPCOMING'
                      ? statusOf(m) === 'SCHEDULED'
                      : statusOf(m) === filter),
              )
              .map((m, i) => (
                <MatchCard
                  key={m.id || i}
                  match={m}
                  index={i}
                  focused={String(m.id) === String(focusMatchId)}
                  disabled={!playable(m)}
                  onPress={() => openMatch(m)}
                />
              ))}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );

  function side(m: any, n: 1 | 2) {
    if (isByeSlot(m, n) || (isResolvedBye(m) && !(n === 1 ? m.participant1_id : m.participant2_id))) return 'BYE';
    return resolveFriendlySide({ id: m[`participant${n}_id`], type: m[`participant${n}_type`] }, participants.data || [], teams.data || []);
  }

  function FixtureCard({ match, index, last, onPress }: { match: any; index: number; last: boolean; onPress: () => void }) {
    const a = side(match, 1);
    const b = side(match, 2);
    const status = statusOf(match);
    const scoreA = match.participant1_score ?? match.participant1Score;
    const scoreB = match.participant2_score ?? match.participant2Score;
    const showScore = status === 'COMPLETED' || status === 'LIVE' || status === 'IN_PROGRESS';
    return (
      <Pressable
        accessibilityLabel={`${formatRound(String(roundOf(match)), 0, 1)} Match ${matchNo(match, index)}, ${label(status)}`}
        disabled={!match.id || !playable(match)}
        onPress={onPress}
        style={[s.fixture, !last && s.fixtureStub]}
      >
        <View style={s.fixtureTop}>
          <Text style={s.fixtureNo}>M{matchNo(match, index)}</Text>
          <Text style={[s.badge, status === 'COMPLETED' && s.done, (status === 'LIVE' || status === 'IN_PROGRESS') && s.live, status === 'BYE' && s.bye]}>
            {isResolvedBye(match) ? '✓ Advanced / BYE' : status === 'COMPLETED' ? '✓' : status === 'LIVE' || status === 'IN_PROGRESS' ? '●' : ''} {isResolvedBye(match) ? '' : label(status)}
          </Text>
        </View>
        <View style={s.sideRow}>
          <Text style={[s.side, a === 'BYE' && s.byeText]} numberOfLines={2}>{a}</Text>
          {showScore && scoreA != null && <Text style={s.miniScore}>{scoreA}</Text>}
        </View>
        <Text style={s.vs}>VS</Text>
        <View style={s.sideRow}>
          <Text style={[s.side, b === 'BYE' && s.byeText]} numberOfLines={2}>{b}</Text>
          {showScore && scoreB != null && <Text style={s.miniScore}>{scoreB}</Text>}
        </View>
      </Pressable>
    );
  }

  function RoundRow({ match, index, onPress }: { match: any; index: number; onPress: () => void }) {
    const a = side(match, 1);
    const b = side(match, 2);
    const status = statusOf(match);
    return (
      <Pressable disabled={!match.id || !playable(match)} onPress={onPress} style={s.roundRow}>
        <View style={s.roundRowTop}>
          <Text style={s.roundRowMatch}>Match {matchNo(match, index)}</Text>
          <Text style={[s.badge, status === 'COMPLETED' && s.done, (status === 'LIVE' || status === 'IN_PROGRESS') && s.live, status === 'BYE' && s.bye]}>
            {isResolvedBye(match) ? 'Advanced / BYE' : label(status)}
          </Text>
        </View>
        <Text style={s.roundRowText}>
          <Text style={a === 'BYE' && s.byeText}>{a}</Text> vs <Text style={b === 'BYE' && s.byeText}>{b}</Text>
        </Text>
      </Pressable>
    );
  }

  function MatchCard({
    match,
    index,
    focused,
    disabled,
    onPress,
  }: {
    match: any;
    index: number;
    focused: boolean;
    disabled: boolean;
    onPress: () => void;
  }) {
    const status = statusOf(match);
    const a = side(match, 1);
    const b = side(match, 2);
    const scoreA = match.participant1Score ?? match.participant1_score ?? match.scoreA;
    const scoreB = match.participant2Score ?? match.participant2_score ?? match.scoreB;
    return (
      <Pressable
        accessibilityLabel={`${formatRound(String(roundOf(match)), 0, 1)} Match ${matchNo(match, index)}, ${label(status)}`}
        disabled={!match.id || disabled}
        onPress={onPress}
        style={[s.matchCard, focused && s.focused]}
      >
        <View style={s.matchTop}>
          <Text style={s.round}>
            {formatRound(String(roundOf(match)), 0, 1)} · Match {matchNo(match, index)}
          </Text>
          <Text style={[s.badge, status === 'COMPLETED' && s.done, (status === 'LIVE' || status === 'IN_PROGRESS') && s.live, status === 'BYE' && s.bye]}>
            {isResolvedBye(match) ? '✓ Advanced / BYE' : status === 'LIVE' || status === 'IN_PROGRESS' ? '● LIVE' : label(status)}
          </Text>
        </View>
        <View style={s.scoreRow}>
          <Text style={[s.matchSide, (disabled || a === 'BYE') && s.tbd]}>{a}</Text>
          {scoreA != null && <Text style={s.score}>{scoreA}</Text>}
        </View>
        <Text style={s.vs}>VS</Text>
        <View style={s.scoreRow}>
          <Text style={[s.matchSide, (disabled || b === 'BYE') && s.tbd]}>{b}</Text>
          {scoreB != null && <Text style={s.score}>{scoreB}</Text>}
        </View>
        <Text style={s.chevron}>›</Text>
      </Pressable>
    );
  }
}

function pairUp(matches: any[]): (any | null)[][] {
  const out: (any | null)[][] = [];
  for (let i = 0; i < matches.length; i += 2) out.push([matches[i], matches[i + 1] ?? null]);
  return out;
}

function Header({ onBack, onMenu }: { onBack: () => void; onMenu: () => void }) {
  return (
    <View style={s.header}>
      <Pressable onPress={onBack} style={s.circle}>
        <Text style={s.back}>‹</Text>
      </Pressable>
      <View style={s.brand}>
        <Text style={s.brandName}>SMASHPOINT</Text>
        <Text style={s.tagline}>PLAY · COMPETE · CONNECT</Text>
      </View>
      <Pressable onPress={onMenu} style={s.circle}>
        <Text style={s.dots}>⋮</Text>
      </Pressable>
    </View>
  );
}
function Tab({ active, title, onPress }: { active: boolean; title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.tab, active && s.tabActive]}>
      <Text style={[s.tabText, active && s.tabTextActive]}>{title}</Text>
    </Pressable>
  );
}
function SwitchTab({ active, title, onPress }: { active: boolean; title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.switchTab, active && s.switchTabActive]}>
      <Text style={[s.switchTabText, active && s.switchTabTextActive]}>{title}</Text>
    </Pressable>
  );
}
function formatRound(value: any, index: number, total: number) {
  const text = String(value);
  if (total > 1 && index === total - 1) return 'Final';
  if (total > 2 && index === total - 2) return 'Semi Final';
  return /^\d+$/.test(text) ? `Round ${text}` : text.replace(/_/g, ' ');
}
const s = StyleSheet.create({
  content: { paddingBottom: spacing.xl, gap: spacing.sm },
  header: { minHeight: 74, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circle: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  back: { fontSize: 32, color: colors.primaryDark },
  dots: { fontSize: 25, color: colors.primaryDark },
  brand: { alignItems: 'center' },
  brandName: { color: colors.primaryDark, fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  tagline: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: spacing.md },
  meta: { color: colors.muted, marginBottom: spacing.md },
  muted: { color: colors.muted, lineHeight: 20 },
  state: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg, ...shadows.card },
  errorCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: '#E9A3A0', ...shadows.card, gap: spacing.sm },
  errorTitle: { color: colors.error, fontWeight: '900', fontSize: 17 },
  empty: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg, ...shadows.card },
  emptyTitle: { color: colors.primaryDark, fontWeight: '900', marginBottom: spacing.sm },
  tabs: { flexDirection: 'row', backgroundColor: colors.surfaceTint, borderRadius: radius.md, padding: 4, marginBottom: spacing.sm },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.primaryDark, fontWeight: '900' },
  tabTextActive: { color: colors.white },
  viewSwitch: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  switchTab: { flex: 1, backgroundColor: colors.surfaceTint, borderRadius: radius.pill, paddingVertical: spacing.sm, alignItems: 'center' },
  switchTabActive: { backgroundColor: colors.primary },
  switchTabText: { color: colors.primaryDark, fontWeight: '900', fontSize: 12 },
  switchTabTextActive: { color: colors.white },
  bracketScroll: { paddingBottom: spacing.md },
  bracket: { flexDirection: 'row', alignItems: 'stretch' },
  roundBlock: { width: 210, marginRight: spacing.lg },
  roundHeader: { marginBottom: spacing.md, alignItems: 'center' },
  roundName: { color: colors.primaryDark, fontWeight: '900', fontSize: 13 },
  roundCount: { color: colors.muted, fontSize: 10, marginTop: 2 },
  column: { flex: 1, justifyContent: 'space-around', gap: spacing.lg },
  pairSlot: { flexDirection: 'row', alignItems: 'center' },
  pairCards: { flex: 1, gap: spacing.md },
  connector: { width: 14, alignSelf: 'stretch', borderRightWidth: 2, borderColor: colors.primary, marginVertical: 4 },
  fixture: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, ...shadows.card },
  fixtureStub: { borderRightWidth: 2, borderRightColor: colors.primary },
  fixturePlaceholder: { flex: 1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', padding: spacing.md, minHeight: 76 },
  fixtureTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fixtureNo: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  sideRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  side: { color: colors.text, fontSize: 12, fontWeight: '800', flex: 1 },
  byeText: { color: colors.muted, fontStyle: 'italic' },
  miniScore: { color: colors.primaryDark, fontWeight: '900', fontSize: 13 },
  vs: { color: colors.muted, fontSize: 10, fontWeight: '900', marginTop: 4 },
  badge: { color: colors.muted, fontSize: 9, fontWeight: '900' },
  done: { color: colors.success },
  live: { color: colors.error },
  bye: { color: colors.warning },
  roundView: { gap: spacing.lg },
  roundGroup: { gap: spacing.sm },
  roundViewTitle: { color: colors.primaryDark, fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  roundRow: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, ...shadows.card },
  roundRowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  roundRowMatch: { color: colors.primaryDark, fontWeight: '900', fontSize: 12 },
  roundRowText: { color: colors.text, fontWeight: '700' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  filter: { backgroundColor: colors.surfaceTint, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  filterActive: { backgroundColor: colors.primary },
  filterText: { color: colors.primaryDark, fontSize: 11, fontWeight: '900' },
  filterTextActive: { color: colors.white },
  matchCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, ...shadows.card },
  focused: { borderColor: colors.primary, borderWidth: 2 },
  matchTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  round: { color: colors.primaryDark, fontWeight: '900' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  matchSide: { color: colors.text, fontWeight: '800', flex: 1 },
  tbd: { color: colors.muted },
  score: { color: colors.text, fontSize: 20, fontWeight: '900' },
  chevron: { color: colors.primary, fontSize: 28, position: 'absolute', right: spacing.md, bottom: spacing.md },
});
