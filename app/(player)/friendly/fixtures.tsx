import { Alert, Image, ImageBackground, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../src/store/authStore';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { PrimaryButton } from '../../../src/components/common/PrimaryButton';
import { BackButton } from '../../../src/components/common/BackButton';
import { colors, radius, spacing } from '../../../src/theme';

// Reusing the same badminton hero artwork already used on the Friendly Match list screen (a male
// player smashing, positioned right, shuttle upper-right, left side dark) — keeps this screen
// visually consistent with the rest of the Friendly Match feature instead of introducing a new
// image. Same small shuttle icon already used elsewhere as a subtle in-card watermark.
const heroBg = require('../../../assets/images/friendly-hero-bg-crop.png');
const shuttleIcon = require('../../../assets/images/shuttle-icon.png');

// Purely decorative avatar colors, cycled by name — no identity/business meaning.
const AVATAR_PALETTE = ['#2F8F52', '#B6469B', '#3B7FC4', '#C48A2F', '#7A5FD1', '#2FA39A'];
const avatarColorFor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};
// A minimal person-silhouette built from plain Views (head + shoulders), so this stays scoped to
// this one file instead of touching the shared TournamentIcon component (used across many other
// screens) just to add a colorable variant.
function PersonGlyph({ color }: { color: string }) {
  return (
    <View style={s.personGlyph}>
      <View style={[s.personHead, { backgroundColor: color }]} />
      <View style={[s.personBody, { backgroundColor: color }]} />
    </View>
  );
}
function Avatar({ name }: { name: string }) {
  const isBye = name === 'BYE';
  return (
    <View style={[s.avatar, { backgroundColor: isBye ? '#3A4A46' : avatarColorFor(name) }]}>
      <PersonGlyph color="rgba(255,255,255,0.92)" />
    </View>
  );
}
function StatusPill({ status, resolvedBye }: { status: string; resolvedBye: boolean }) {
  const isLive = status === 'LIVE' || status === 'IN_PROGRESS';
  const isDone = status === 'COMPLETED';
  return (
    <View style={[s.statusPill, isDone && s.statusPillDone, isLive && s.statusPillLive]}>
      {isDone && <Text style={s.statusPillTextDone}>✓</Text>}
      {isLive && <View style={s.liveDot} />}
      <Text style={[s.statusPillText, isDone && s.statusPillTextDone, isLive && s.statusPillTextLive]}>
        {resolvedBye ? 'COMPLETED' : label(status)}
      </Text>
    </View>
  );
}
import {
  friendlyApi,
  friendlyKeys,
  friendlyLifecycleApi,
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
  const isKnockout = detail.data?.format === 'KNOCKOUT';
  const result = useQuery({
    queryKey: friendlyKeys.result(id),
    queryFn: () => friendlyLifecycleApi.result(id),
    enabled: !!id && isKnockout,
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
  const championName =
    isKnockout && result.data?.winner
      ? resolveFriendlySide(
          { id: result.data.winner.participantId, type: result.data.winner.participantType },
          participants.data || [],
          teams.data || [],
        )
      : null;
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
  const status = String(detail.data?.status || '').toUpperCase();
  const playerCount = detail.data?.participant_count ?? detail.data?.participantCount ?? 0;
  const maxPlayers = detail.data?.max_players ?? detail.data?.maxPlayers ?? 0;
  return (
    <ScreenContainer dark>
      <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl tintColor={colors.lime} refreshing={query.isFetching} onRefresh={refresh} />}>
        <Hero
          title={detail.data?.title || 'Fixtures'}
          subtitle={`${detail.data?.event_type || 'MATCH'} · ${detail.data?.format || ''}`}
          playerCount={playerCount}
          maxPlayers={maxPlayers}
          status={status}
          hasDetail={!!detail.data}
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
            {!!championName && (
              <Pressable
                style={s.championBanner}
                onPress={() => router.push({ pathname: '/(player)/friendly/results', params: { id: String(id) } })}
              >
                <Text style={s.championTrophy}>🏆</Text>
                <View style={s.championCopy}>
                  <Text style={s.championLabel}>TOURNAMENT CHAMPION</Text>
                  <Text style={s.championName}>{championName}</Text>
                  <Text style={s.championSub}>Well played! 🎉</Text>
                </View>
                <Text style={s.championChevron}>›</Text>
              </Pressable>
            )}
          </>
        )}

        {!!data.length && tab === 'MATCHES' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
              {(['ALL', 'LIVE', 'UPCOMING', 'COMPLETED'] as Filter[]).map((x) => {
                const active = filter === x;
                const icon = x === 'LIVE' ? '●' : x === 'UPCOMING' ? '◷' : x === 'COMPLETED' ? '✓' : null;
                return (
                  <Pressable key={x} onPress={() => setFilter(x)} style={[s.filter, active && s.filterActive]}>
                    {icon && (
                      <Text style={[s.filterIcon, x === 'LIVE' && s.filterIconLive, active && s.filterIconActive]}>{icon}</Text>
                    )}
                    <Text style={[s.filterText, active && s.filterTextActive]}>
                      {x === 'ALL'
                        ? `All (${data.length})`
                        : `${x[0]}${x.slice(1).toLowerCase()} (${
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
                );
              })}
            </ScrollView>
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
    const winnerId = match.winner_id ?? match.winnerId;
    const p1Id = match.participant1_id ?? match.participant1Id;
    const p2Id = match.participant2_id ?? match.participant2Id;
    const aWon = status === 'COMPLETED' && (winnerId ? winnerId === p1Id : scoreA != null && scoreB != null && scoreA > scoreB);
    const bWon = status === 'COMPLETED' && (winnerId ? winnerId === p2Id : scoreA != null && scoreB != null && scoreB > scoreA);
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
        <View style={[s.sideRow, aWon && s.sideRowWinner]}>
          {aWon && <Text style={s.sideTrophy}>🏆</Text>}
          <Text style={[s.side, aWon && s.sideWinnerText, a === 'BYE' && s.byeText]} numberOfLines={2}>{a}</Text>
          {showScore && scoreA != null && <Text style={[s.miniScore, aWon && s.sideWinnerText]}>{scoreA}</Text>}
        </View>
        <Text style={s.vs}>vs</Text>
        <View style={[s.sideRow, bWon && s.sideRowWinner]}>
          {bWon && <Text style={s.sideTrophy}>🏆</Text>}
          <Text style={[s.side, bWon && s.sideWinnerText, b === 'BYE' && s.byeText]} numberOfLines={2}>{b}</Text>
          {showScore && scoreB != null && <Text style={[s.miniScore, bWon && s.sideWinnerText]}>{scoreB}</Text>}
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
    // Owner-only + raw SCHEDULED (excludes LIVE/IN_PROGRESS/COMPLETED, including BYE-auto-completed
    // matches, which are persisted as COMPLETED) + playable() (both sides resolved to real names,
    // neither TBD, not a BYE slot) — reuses the same helpers/condition already gating whether the
    // card itself is tappable, so this can never show for a state the card wouldn't also open.
    const canStart = owner && status === 'SCHEDULED' && playable(match);
    const resolvedBye = isResolvedBye(match);
    return (
      <Pressable
        accessibilityLabel={`${formatRound(String(roundOf(match)), 0, 1)} Match ${matchNo(match, index)}, ${label(status)}`}
        disabled={!match.id || disabled}
        onPress={onPress}
        style={[s.matchCard, focused && s.focused]}
      >
        <Image source={shuttleIcon} style={s.cardWatermark} resizeMode="contain" />
        <View style={s.matchTop}>
          <View style={s.matchTopLeft}>
            <Text style={s.trophyGlyph}>🏆</Text>
            <Text style={s.round}>
              {formatRound(String(roundOf(match)), 0, 1)} · Match {matchNo(match, index)}
            </Text>
          </View>
          <StatusPill status={status} resolvedBye={resolvedBye} />
        </View>
        <View style={s.scoreRow}>
          <Avatar name={a} />
          <Text style={[s.matchSide, (disabled || a === 'BYE') && s.tbd]} numberOfLines={1}>{a}</Text>
          {scoreA != null && (
            <View style={s.scoreBox}>
              <Text style={s.score}>{scoreA}</Text>
            </View>
          )}
        </View>
        <Text style={s.vs}>vs</Text>
        <View style={s.scoreRow}>
          <Avatar name={b} />
          <Text style={[s.matchSide, (disabled || b === 'BYE') && s.tbd]} numberOfLines={1}>{b}</Text>
          {scoreB != null && (
            <View style={s.scoreBox}>
              <Text style={s.score}>{scoreB}</Text>
            </View>
          )}
        </View>
        {canStart && (
          <Pressable accessibilityLabel="Start Match" onPress={onPress} style={s.startButton}>
            <Text style={s.startButtonIcon}>▶</Text>
            <Text style={s.startButtonText}>Start Match</Text>
          </Pressable>
        )}
      </Pressable>
    );
  }
}

function pairUp(matches: any[]): (any | null)[][] {
  const out: (any | null)[][] = [];
  for (let i = 0; i < matches.length; i += 2) out.push([matches[i], matches[i + 1] ?? null]);
  return out;
}

function Hero({
  title,
  subtitle,
  playerCount,
  maxPlayers,
  status,
  hasDetail,
  onBack,
  onMenu,
}: {
  title: string;
  subtitle: string;
  playerCount: number;
  maxPlayers: number;
  status: string;
  hasDetail: boolean;
  onBack: () => void;
  onMenu: () => void;
}) {
  return (
    <ImageBackground source={heroBg} style={s.hero} imageStyle={s.heroImage}>
      <View style={s.heroOverlay} />
      <View style={s.heroTopRow}>
        <BackButton variant="dark" onPress={onBack} />
        <Pressable onPress={onMenu} style={s.circle}>
          <Text style={s.dots}>⋮</Text>
        </Pressable>
      </View>
      <View style={s.heroBody}>
        <Text style={s.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={s.meta}>{subtitle}</Text>
        {hasDetail && (
          <View style={s.summaryRow}>
            <View style={s.summaryIconWrap}>
              <PersonGlyph color="rgba(255,255,255,0.9)" />
            </View>
            <Text style={s.summaryPillText}>
              {playerCount}/{maxPlayers} players
            </Text>
            <View style={s.summaryDivider} />
            <View style={s.activePill}>
              <Text style={s.activePillText}>{status || 'OPEN'}</Text>
            </View>
          </View>
        )}
      </View>
    </ImageBackground>
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
const DARK_CARD = '#0C2E27';
const DARK_CARD_BORDER = '#164A3C';
const DARK_SURFACE = '#0F3A30';
const s = StyleSheet.create({
  content: { paddingBottom: spacing.xl, gap: spacing.sm },
  hero: { minHeight: 220, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.sm, padding: spacing.lg, justifyContent: 'space-between' },
  heroImage: { resizeMode: 'cover' },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(6, 26, 21, 0.62)' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circle: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  dots: { fontSize: 25, color: colors.white },
  heroBody: { marginTop: spacing.lg },
  title: { color: colors.white, fontSize: 28, fontWeight: '900' },
  meta: { color: '#C7E4D8', marginTop: 2, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  summaryIconWrap: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  summaryPillText: { color: '#DCEFE7', fontSize: 12, fontWeight: '700' },
  summaryDivider: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#DCEFE7', marginHorizontal: 2 },
  activePill: { backgroundColor: colors.lime, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  activePillText: { color: colors.primaryDark, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  muted: { color: '#8FB3A6', lineHeight: 20 },
  state: { backgroundColor: DARK_CARD, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: DARK_CARD_BORDER },
  errorCard: { backgroundColor: DARK_CARD, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: '#7A3B3B', gap: spacing.sm },
  errorTitle: { color: '#F49B98', fontWeight: '900', fontSize: 17 },
  empty: { backgroundColor: DARK_CARD, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: DARK_CARD_BORDER },
  emptyTitle: { color: colors.white, fontWeight: '900', marginBottom: spacing.sm },
  tabs: { flexDirection: 'row', backgroundColor: DARK_SURFACE, borderRadius: radius.md, padding: 4, marginBottom: spacing.sm },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: '#8FB3A6', fontWeight: '900' },
  tabTextActive: { color: colors.white },
  viewSwitch: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  switchTab: { flex: 1, backgroundColor: DARK_SURFACE, borderRadius: radius.pill, paddingVertical: spacing.sm, alignItems: 'center' },
  switchTabActive: { backgroundColor: colors.lime },
  switchTabText: { color: '#8FB3A6', fontWeight: '900', fontSize: 12 },
  switchTabTextActive: { color: colors.primaryDark },
  bracketScroll: { paddingBottom: spacing.md },
  bracket: { flexDirection: 'row', alignItems: 'stretch' },
  roundBlock: { width: 220, marginRight: spacing.lg },
  roundHeader: { marginBottom: spacing.md, alignItems: 'center' },
  roundName: { color: colors.white, fontWeight: '900', fontSize: 13 },
  roundCount: { color: '#8FB3A6', fontSize: 10, marginTop: 2 },
  column: { flex: 1, justifyContent: 'space-around', gap: spacing.lg },
  pairSlot: { flexDirection: 'row', alignItems: 'center' },
  pairCards: { flex: 1, gap: spacing.md },
  connector: { width: 14, alignSelf: 'stretch', borderRightWidth: 2, borderColor: colors.lime, marginVertical: 4 },
  fixture: { flex: 1, backgroundColor: DARK_CARD, borderRadius: radius.md, borderWidth: 1, borderColor: DARK_CARD_BORDER, padding: spacing.md },
  fixtureStub: { borderRightWidth: 2, borderRightColor: colors.lime },
  fixturePlaceholder: { flex: 1, borderRadius: radius.md, borderWidth: 1, borderColor: DARK_CARD_BORDER, borderStyle: 'dashed', padding: spacing.md, minHeight: 76 },
  fixtureTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fixtureNo: { color: '#8FB3A6', fontSize: 10, fontWeight: '800' },
  sideRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingHorizontal: 6, paddingVertical: 4, borderRadius: radius.sm },
  sideRowWinner: { backgroundColor: 'rgba(138, 226, 52, 0.14)' },
  sideTrophy: { fontSize: 12 },
  side: { color: '#D7E7E0', fontSize: 12, fontWeight: '800', flex: 1 },
  sideWinnerText: { color: colors.lime },
  byeText: { color: '#8FB3A6', fontStyle: 'italic' },
  miniScore: { color: '#D7E7E0', fontWeight: '900', fontSize: 13 },
  vs: { color: '#8FB3A6', fontSize: 10, fontWeight: '900', marginTop: 4 },
  badge: { color: '#8FB3A6', fontSize: 9, fontWeight: '900' },
  done: { color: colors.lime },
  live: { color: '#F49B98' },
  bye: { color: colors.warning },
  roundView: { gap: spacing.lg },
  roundGroup: { gap: spacing.sm },
  roundViewTitle: { color: colors.white, fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  roundRow: { backgroundColor: DARK_CARD, borderRadius: radius.md, borderWidth: 1, borderColor: DARK_CARD_BORDER, padding: spacing.md },
  roundRowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  roundRowMatch: { color: colors.white, fontWeight: '900', fontSize: 12 },
  roundRowText: { color: '#D7E7E0', fontWeight: '700' },
  filters: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm, paddingRight: spacing.md },
  filter: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: DARK_SURFACE, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  filterActive: { backgroundColor: colors.lime },
  filterIcon: { color: '#8FB3A6', fontSize: 10, fontWeight: '900' },
  filterIconLive: { color: '#F49B98' },
  filterIconActive: { color: colors.primaryDark },
  filterText: { color: '#8FB3A6', fontSize: 11, fontWeight: '900' },
  filterTextActive: { color: colors.primaryDark },
  matchCard: { backgroundColor: DARK_CARD, borderRadius: radius.lg, borderWidth: 1, borderColor: DARK_CARD_BORDER, padding: spacing.lg, gap: 2, overflow: 'hidden' },
  focused: { borderColor: colors.lime, borderWidth: 2 },
  cardWatermark: { position: 'absolute', right: -14, top: -10, width: 96, height: 96, opacity: 0.06, tintColor: colors.lime },
  matchTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  matchTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trophyGlyph: { fontSize: 13 },
  round: { color: colors.white, fontWeight: '900', fontSize: 15 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  personGlyph: { width: 16, height: 16, alignItems: 'center' },
  personHead: { width: 7, height: 7, borderRadius: 4, marginBottom: 1 },
  personBody: { width: 12, height: 7, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  matchSide: { color: colors.white, fontWeight: '800', fontSize: 15, flex: 1 },
  startButton: {
    marginTop: spacing.md,
    backgroundColor: colors.lime,
    borderRadius: radius.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startButtonIcon: { color: colors.primaryDark, fontSize: 13 },
  startButtonText: { color: colors.primaryDark, fontWeight: '900', fontSize: 15 },
  tbd: { color: '#8FB3A6' },
  scoreBox: { backgroundColor: DARK_SURFACE, borderRadius: radius.sm, minWidth: 30, paddingHorizontal: 8, paddingVertical: 3, alignItems: 'center' },
  score: { color: colors.white, fontSize: 16, fontWeight: '900' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  statusPillText: { color: '#8FB3A6', fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },
  statusPillDone: { backgroundColor: colors.lime },
  statusPillTextDone: { color: colors.primaryDark },
  statusPillLive: { backgroundColor: 'rgba(244, 155, 152, 0.16)' },
  statusPillTextLive: { color: '#F49B98' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F49B98' },
  championBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    backgroundColor: 'rgba(246, 195, 67, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(246, 195, 67, 0.45)',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  championTrophy: { fontSize: 30 },
  championCopy: { flex: 1, minWidth: 0 },
  championLabel: { color: '#F6C343', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  championName: { color: colors.white, fontSize: 18, fontWeight: '900', marginTop: 4 },
  championSub: { color: '#D7E7E0', fontSize: 12, marginTop: 2 },
  championChevron: { color: '#F6C343', fontSize: 26, fontWeight: '900' },
});
