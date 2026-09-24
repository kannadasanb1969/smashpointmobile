import { RefreshControl, ScrollView, StyleSheet, Text, Pressable, View, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { BackButton } from '../../src/components/common/BackButton';
import { ops } from '../../src/features/organizer/operations';
import {
  groupFixtures,
  groupByPool,
  matchParticipant,
  roundLabel,
  computeStandings,
} from '../../src/features/organizer/fixtureHelpers';
import { MatchCard } from '../../src/components/organizer/MatchCard';
import { useTournament } from '../../src/features/player/api';
import { useAuthStore } from '../../src/store/authStore';
import { colors, radius, shadows, spacing } from '../../src/theme';
import { useEffect, useState } from 'react';

type LeagueTab = 'POOLS' | 'MATCHES' | 'STANDINGS' | 'BRACKET';
type KnockoutTab = 'BRACKET' | 'MATCHES';

export default function Fixtures() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [knockoutTab, setKnockoutTab] = useState<KnockoutTab>('BRACKET');
  const [leagueTab, setLeagueTab] = useState<LeagueTab>('POOLS');
  const [categoryId, setCategoryId] = useState('');
  const me = useAuthStore((s) => s.user?.id) || '';
  const tournament = useTournament(id);
  const client = useQueryClient();
  const queryKey = ['organizer-fixtures', id, categoryId];
  const query = useQuery({
    queryKey,
    queryFn: () => ops.fixtures(String(id), categoryId || undefined).then((r) => r.data),
    enabled: Boolean(id),
  });
  const fixtures = Array.isArray(query.data) ? query.data : [];
  // A fixture's own `format` (set at generation time) is the source of truth for how THIS category's
  // bracket/round-robin was actually built — it can differ from the tournament's nominal format is
  // never expected to, but falling back to the tournament level keeps the empty-state (pre-generation)
  // screen sensible. Never hardcode "KNOCKOUT": that previously showed "Fixture - Knockout" and a
  // bracket UI for a 16-team LEAGUE fixture that only ever had round-robin data behind it.
  // `fixtures.category_id` is UNIQUE in the backend — a category ever has exactly one fixture row, so
  // promotion appends the Knockout bracket's matches onto this SAME League fixture (see fixture.service.js
  // promote()) rather than creating a second one. No separate "which fixture is active" logic is needed.
  const activeFixture = fixtures.find((f: any) => String(f.categoryId ?? f.category_id) === categoryId) || fixtures[0];
  const format = String(
    activeFixture?.format || tournament.data?.fixtureFormat || tournament.data?.format || '',
  ).toUpperCase();
  const isLeague = format === 'LEAGUE' || format === 'ROUND_ROBIN';
  const matches = fixtures.flatMap((fixture: any) =>
    (fixture.matches || []).map((match: any) => ({
      ...match,
      fixtureId: fixture.id,
      participants: fixture.participants || [],
    })),
  );
  const activeParticipants = activeFixture?.participants || [];
  const pools = activeFixture?.pools || [];
  const hasPools = isLeague && pools.length > 0;
  const rounds = groupFixtures(matches as any);
  const standings = isLeague ? computeStandings(matches, activeParticipants) : [];
  const poolGroups = hasPools ? groupByPool(matches as any, activeParticipants, pools) : [];
  const category = (tournament.data?.categories || []).find(
    (c: any) => String(c.id) === categoryId,
  );
  const draftFixture = fixtures.find((f: any) => f.status === 'DRAFT');
  const activeFixtureMatches = activeFixture?.matches || [];
  const allPoolMatchesComplete =
    hasPools &&
    activeFixtureMatches.length > 0 &&
    activeFixtureMatches.every((m: any) => String(m.status).toUpperCase() === 'COMPLETED');
  const alreadyPromoted = Boolean(activeFixture?.promotedToFixtureId ?? activeFixture?.promoted_to_fixture_id);
  // Promotion appends bracket matches to the same fixture without a fixture_pool_matches link, so poolId is
  // null on them — that's what tells a pool match apart from a post-promotion knockout match.
  const bracketMatches = matches.filter((m: any) => !m.poolId && !m.pool_id);
  const bracketRounds = groupFixtures(bracketMatches as any);
  const leagueTabs: LeagueTab[] = alreadyPromoted
    ? ['POOLS', 'MATCHES', 'STANDINGS', 'BRACKET']
    : ['POOLS', 'MATCHES', 'STANDINGS'];
  useEffect(() => {
    const categories = tournament.data?.categories || [];
    if (!categoryId && categories.length === 1) setCategoryId(String(categories[0].id));
  }, [categoryId, tournament.data?.categories]);
  useEffect(() => {
    // A League fixture has no bracket to show; keep the tab selection valid if the format changes
    // (e.g. switching categories) instead of silently rendering an empty Bracket view.
    if (isLeague && knockoutTab === 'BRACKET') setKnockoutTab('MATCHES');
  }, [isLeague, knockoutTab]);
  const generate = useMutation({
    mutationFn: () =>
      ops.generate(
        String(id),
        categoryId,
        tournament.data?.fixtureFormat || tournament.data?.format || 'KNOCKOUT',
        me,
      ),
    onSuccess: () =>
      Promise.all([query.refetch(), client.invalidateQueries({ queryKey })]),
    onError: (e: any) =>
      Alert.alert('Unable to generate fixture', e?.message || 'Please try again.'),
  });
  const publish = useMutation({
    mutationFn: () => ops.publishFixture(String(draftFixture?.id)),
    onSuccess: () =>
      Promise.all([query.refetch(), client.invalidateQueries({ queryKey })]),
    onError: (e: any) =>
      Alert.alert('Unable to publish fixture', e?.message || 'Please try again.'),
  });
  const promote = useMutation({
    mutationFn: () => ops.promoteFixture(String(activeFixture?.id)),
    onSuccess: () =>
      Promise.all([query.refetch(), client.invalidateQueries({ queryKey })]),
    onError: (e: any) =>
      Alert.alert('Unable to promote qualifiers', e?.message || 'Please try again.'),
  });
  const openMatch = (matchId: string) =>
    router.push({ pathname: '/(organizer)/matches/[id]', params: { id: matchId } });
  return (
    <ScreenContainer dark>
      <ScrollView
        refreshControl={
          <RefreshControl
            tintColor={colors.lime}
            refreshing={query.isFetching}
            onRefresh={() => query.refetch()}
          />
        }
        contentContainerStyle={s.page}
      >
        <BackButton variant="dark" style={s.back} />
        <Text style={s.eyebrow}>ORGANIZER FIXTURES</Text>
        <Text style={s.title}>
          {!activeFixture ? 'Fixtures' : isLeague ? 'League Fixtures' : 'Fixture - Knockout'}
        </Text>
        <Text style={s.subtitle}>{tournament.data?.name || 'Tournament'}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.categoryRow}
        >
          {(tournament.data?.categories || []).map((c: any) => (
            <Pressable
              key={c.id}
              onPress={() => setCategoryId(String(c.id))}
              style={[s.category, categoryId === String(c.id) && s.categoryActive]}
            >
              <Text style={[s.categoryText, categoryId === String(c.id) && s.categoryTextActive]}>
                {c.name || c.eventType}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {isLeague ? (
          <View style={s.tabs}>
            {leagueTabs.map((t) => (
              <Pressable
                key={t}
                onPress={() => setLeagueTab(t)}
                style={[s.tab, leagueTab === t && s.tabActive]}
              >
                <Text style={s.tabText}>{t.charAt(0) + t.slice(1).toLowerCase()}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={s.tabs}>
            <Pressable
              onPress={() => setKnockoutTab('BRACKET')}
              style={[s.tab, knockoutTab === 'BRACKET' && s.tabActive]}
            >
              <Text style={s.tabText}>Bracket</Text>
            </Pressable>
            <Pressable
              onPress={() => setKnockoutTab('MATCHES')}
              style={[s.tab, knockoutTab === 'MATCHES' && s.tabActive]}
            >
              <Text style={s.tabText}>Matches</Text>
            </Pressable>
          </View>
        )}
        {query.isLoading && <Text style={s.muted}>Loading fixtures…</Text>}
        {query.isError && (
          <Text onPress={() => query.refetch()} style={s.error}>
            Unable to load fixtures. Tap to retry.
          </Text>
        )}
        {!query.isLoading && !query.isError && !matches.length && (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No fixtures generated</Text>
            <Text style={s.muted}>
              {categoryId
                ? `Generate a fixture for ${category?.name || category?.eventType || 'this category'} to see the draw.`
                : 'Select a category above, then generate its fixture.'}
            </Text>
            {categoryId && tournament.data?.status === 'PUBLISHED' && (
              <PrimaryButton
                disabled={generate.isPending}
                title={generate.isPending ? 'Generating…' : 'Generate Fixture'}
                onPress={() => {
                  if (generate.isPending) return;
                  Alert.alert(
                    'Generate fixture?',
                    'This creates the draw for the selected category from its active registrations.',
                    [
                      { text: 'Cancel' },
                      { text: 'Generate', onPress: () => generate.mutate() },
                    ],
                  );
                }}
              />
            )}
          </View>
        )}
        {draftFixture && (
          <PrimaryButton
            disabled={publish.isPending}
            title={publish.isPending ? 'Publishing…' : 'Publish Fixture'}
            onPress={() => {
              if (publish.isPending) return;
              Alert.alert(
                'Publish fixture?',
                'Once published, players can see the draw and matches can be started.',
                [{ text: 'Cancel' }, { text: 'Publish', onPress: () => publish.mutate() }],
              );
            }}
          />
        )}

        {/* KNOCKOUT: bracket view with connector lines, unchanged from before */}
        {!isLeague && knockoutTab === 'BRACKET' && matches.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={s.bracket}>
            {rounds.map((round: any) => (
              <View key={round.round} style={s.roundColumn}>
                <Text style={s.roundTitle}>{roundLabel(round.round, format)}</Text>
                <Text style={s.roundCount}>{round.fixtures.length} matches</Text>
                {round.fixtures.map((m: any) => (
                  <View key={m.id} style={s.node}>
                    <View style={s.nodeTop}>
                      <Text style={s.code}>
                        {m.matchCode || m.match_code || `M${m.matchNumber}`}
                      </Text>
                      <Text style={s.nodeStatus}>{m.status || 'SCHEDULED'}</Text>
                    </View>
                    <Text style={s.participant}>{matchParticipant(m, 1)}</Text>
                    <Text style={s.vs}>VS</Text>
                    <Text style={s.participant}>{matchParticipant(m, 2)}</Text>
                    <View style={s.connector} />
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        )}

        {/* LEAGUE: Pools tab — dynamically-generated pools, never hardcoded */}
        {isLeague && leagueTab === 'POOLS' && (
          <View style={s.leagueRounds}>
            {hasPools ? (
              poolGroups.map((g) => (
                <View key={g.pool.id} style={s.poolCard}>
                  <View style={s.leagueRoundHeader}>
                    <Text style={s.leagueRoundTitle}>Pool {g.pool.name}</Text>
                    <Text style={s.roundCount}>{g.participants.length} teams</Text>
                  </View>
                  {g.participants.map((p: any) => (
                    <Text key={p.participantId ?? p.participant_id ?? p.id} style={s.poolMember}>
                      {p.displayName || p.display_name || 'TBD'}
                    </Text>
                  ))}
                </View>
              ))
            ) : (
              <Text style={s.muted}>No pools generated yet.</Text>
            )}
          </View>
        )}

        {/* LEAGUE: Standings tab — one table per pool */}
        {isLeague && leagueTab === 'STANDINGS' && (
          <View style={s.leagueRounds}>
            {(hasPools ? poolGroups : [{ pool: null, standings, participants: activeParticipants }]).map(
              (g: any, gi: number) => (
                <View key={g.pool?.id ?? gi} style={s.standingsTable}>
                  {g.pool && <Text style={s.leagueRoundTitle}>Pool {g.pool.name}</Text>}
                  <View style={s.standingsHeaderRow}>
                    <Text style={[s.standingsCell, s.standingsTeam, s.standingsHeaderText]}>Team</Text>
                    <Text style={[s.standingsCell, s.standingsHeaderText]}>P</Text>
                    <Text style={[s.standingsCell, s.standingsHeaderText]}>W</Text>
                    <Text style={[s.standingsCell, s.standingsHeaderText]}>L</Text>
                    <Text style={[s.standingsCell, s.standingsHeaderText]}>+/-</Text>
                    <Text style={[s.standingsCell, s.standingsHeaderText]}>Pts</Text>
                  </View>
                  {g.standings.map((row: any) => {
                    const p = g.participants.find(
                      (x: any) => String(x.participantId ?? x.participant_id) === row.participantId,
                    );
                    return (
                      <View key={row.participantId} style={s.standingsRow}>
                        <Text style={[s.standingsCell, s.standingsTeam]}>
                          {p?.displayName || p?.display_name || row.participantId}
                        </Text>
                        <Text style={s.standingsCell}>{row.played}</Text>
                        <Text style={s.standingsCell}>{row.won}</Text>
                        <Text style={s.standingsCell}>{row.lost}</Text>
                        <Text style={s.standingsCell}>{row.pointDiff}</Text>
                        <Text style={s.standingsCell}>{row.points}</Text>
                      </View>
                    );
                  })}
                  {!g.standings.length && <Text style={s.muted}>No teams to rank yet.</Text>}
                </View>
              ),
            )}
            {hasPools && !alreadyPromoted && (
              <View>
                <PrimaryButton
                  disabled={!allPoolMatchesComplete || promote.isPending}
                  title={promote.isPending ? 'Promoting…' : 'Promote Qualifiers to Knockout'}
                  onPress={() => {
                    if (promote.isPending) return;
                    Alert.alert(
                      'Promote qualifiers?',
                      'This generates the Knockout bracket from each pool’s qualifiers.',
                      [{ text: 'Cancel' }, { text: 'Promote', onPress: () => promote.mutate() }],
                    );
                  }}
                />
                {!allPoolMatchesComplete && (
                  <Text style={s.muted}>All pool matches must be completed before promoting.</Text>
                )}
              </View>
            )}
            {alreadyPromoted && <Text style={s.muted}>Qualifiers promoted — see the Bracket for the Knockout stage.</Text>}
          </View>
        )}

        {/* LEAGUE Matches tab: Pool -> Round -> Match Card. KNOCKOUT Matches tab: flat, same Match Card. */}
        {isLeague && leagueTab === 'MATCHES' &&
          (hasPools ? (
            poolGroups.map((g) => (
              <View key={g.pool.id} style={s.leagueRoundGroup}>
                <Text style={s.leagueRoundTitle}>Pool {g.pool.name}</Text>
                {g.rounds.map((round: any) => (
                  <View key={round.round} style={s.leagueRoundGroup}>
                    <View style={s.leagueRoundHeader}>
                      <Text style={s.matchRound}>{roundLabel(round.round, format)}</Text>
                      <Text style={s.roundCount}>{round.fixtures.length} matches</Text>
                    </View>
                    {round.fixtures.map((m: any, index: number) => (
                      <MatchCard key={m.id} match={m} format={format} index={index} onPress={() => openMatch(String(m.id))} />
                    ))}
                  </View>
                ))}
              </View>
            ))
          ) : (
            matches.map((m: any, index: number) => (
              <MatchCard key={m.id} match={m} format={format} index={index} onPress={() => openMatch(String(m.id))} />
            ))
          ))}
        {!isLeague && knockoutTab === 'MATCHES' &&
          matches.map((m: any, index: number) => (
            <MatchCard key={m.id} match={m} format={format} index={index} onPress={() => openMatch(String(m.id))} />
          ))}

        {/* LEAGUE: Bracket tab — appears once qualifiers are promoted; same node/connector visuals as the
            Knockout bracket, reused rather than redesigned, but scoped to only the post-promotion matches. */}
        {isLeague && leagueTab === 'BRACKET' && bracketMatches.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={s.bracket}>
            {bracketRounds.map((round: any) => (
              <View key={round.round} style={s.roundColumn}>
                <Text style={s.roundTitle}>{roundLabel(round.round, 'KNOCKOUT')}</Text>
                <Text style={s.roundCount}>{round.fixtures.length} matches</Text>
                {round.fixtures.map((m: any) => (
                  <View key={m.id} style={s.node}>
                    <View style={s.nodeTop}>
                      <Text style={s.code}>
                        {m.matchCode || m.match_code || `M${m.matchNumber}`}
                      </Text>
                      <Text style={s.nodeStatus}>{m.status || 'SCHEDULED'}</Text>
                    </View>
                    <Text style={s.participant}>{matchParticipant(m, 1)}</Text>
                    <Text style={s.vs}>VS</Text>
                    <Text style={s.participant}>{matchParticipant(m, 2)}</Text>
                    <View style={s.connector} />
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  page: { paddingBottom: 50 },
  back: { marginTop: spacing.md },
  eyebrow: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginTop: spacing.lg,
  },
  title: { color: colors.white, fontSize: 29, fontWeight: '900', marginTop: spacing.sm },
  subtitle: { color: '#A8B6B1', marginTop: 6 },
  categoryRow: { gap: 8, paddingVertical: spacing.lg },
  category: {
    borderWidth: 1,
    borderColor: '#18553F',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  categoryText: { color: '#C6DDD1', fontWeight: '800', fontSize: 12 },
  categoryTextActive: { color: colors.primaryDark },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  tab: {
    backgroundColor: '#082B24',
    borderColor: '#18553F',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  tabActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  tabText: { color: colors.white, fontWeight: '900' },
  bracket: { gap: 20, paddingVertical: 8, paddingRight: 20 },
  roundColumn: { width: 210 },
  roundTitle: { color: colors.lime, fontWeight: '900', fontSize: 15 },
  roundCount: { color: '#A8B6B1', fontSize: 11, marginTop: 3, marginBottom: 12 },
  node: {
    backgroundColor: '#F5F8F7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C9DAD2',
    padding: 12,
    marginBottom: 22,
    minHeight: 106,
    ...shadows.card,
  },
  nodeTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  code: { color: '#526575', fontSize: 10, fontWeight: '900' },
  nodeStatus: { color: '#9B650B', fontSize: 9, fontWeight: '900' },
  participant: { color: '#15231F', fontSize: 14, fontWeight: '800' },
  vs: { color: '#8A9892', fontSize: 9, fontWeight: '900', marginVertical: 3 },
  connector: {
    position: 'absolute',
    right: -20,
    top: '50%',
    width: 20,
    height: 1,
    backgroundColor: colors.lime,
  },
  leagueRounds: { gap: spacing.lg },
  leagueRoundGroup: { gap: 8 },
  leagueRoundHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leagueRoundTitle: { color: colors.lime, fontWeight: '900', fontSize: 15 },
  leagueRow: {
    backgroundColor: '#F5F8F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C9DAD2',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  poolCard: {
    backgroundColor: '#F5F8F7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C9DAD2',
    padding: 14,
    gap: 4,
  },
  poolMember: { color: '#15231F', fontSize: 14, fontWeight: '700', paddingVertical: 4 },
  standingsTable: { backgroundColor: '#F5F8F7', borderRadius: 14, padding: 12, gap: 4 },
  standingsHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#C9DAD2', paddingBottom: 8, marginBottom: 4 },
  standingsRow: { flexDirection: 'row', paddingVertical: 6 },
  standingsCell: { flex: 1, color: '#15231F', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  standingsTeam: { flex: 2, textAlign: 'left', fontWeight: '900' },
  standingsHeaderText: { color: '#526575', fontWeight: '900', fontSize: 11 },
  matchRound: { color: colors.muted, fontSize: 11, marginVertical: 8 },
  empty: {
    backgroundColor: '#06251F',
    borderWidth: 1,
    borderColor: '#0D6049',
    borderRadius: 16,
    padding: 22,
  },
  emptyTitle: { color: colors.white, fontSize: 17, fontWeight: '900', marginBottom: 7 },
  muted: { color: '#A8B6B1', lineHeight: 20 },
  error: { color: '#FF9B9B', padding: 20 },
});
