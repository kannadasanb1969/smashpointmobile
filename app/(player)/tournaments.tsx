import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { BottomNav } from '../../src/components/common/BottomNav';
import { useTournaments, usePlayers } from '../../src/features/player/api';
import { colors } from '../../src/theme';
import { QueryState } from '../../src/components/feedback/QueryState';
import { StatusBadge } from '../../src/components/common/StatusBadge';
import { useResults } from '../../src/features/player/achievements';
import { ops } from '../../src/features/organizer/operations';
import {
  findFinalFixture,
  getFixtureRunnerUp,
  getFixtureWinner,
  normalizeFixtureResponse,
  participantNames,
} from '../../src/features/player/tournamentResults';
const statuses = ['OPEN', 'CLOSED', 'COMPLETED', 'ALL'] as const;
const listStatus = (t: any) => {
  if (t.status === 'COMPLETED' || t.completionStatus === 'COMPLETED') return 'COMPLETED';
  const close = String(t.registrationCloseDate || t.registrationEndDate || '').slice(0, 10);
  const expired =
    /^\d{4}-\d{2}-\d{2}$/.test(close) && new Date().toISOString().slice(0, 10) > close;
  const open =
    Array.isArray(t.categories) &&
    t.categories.some((c: any) => c.registrationPhase === 'OPEN' && !c.registrationClosedAt);
  return !expired && open ? 'OPEN' : 'CLOSED';
};
const dateLabel = (v?: string) =>
  v
    ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Date TBC';
export default function Tournaments() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState(0);
  const [event, setEvent] = useState('');
  const q = useTournaments({});
  const data = useMemo(
    () =>
      ((q.data || []) as any[])
        .filter((t) => t.status === 'PUBLISHED')
        .filter((t) => {
          const x = search.trim().toLowerCase();
          return (
            !x ||
            [t.name, t.venue, t.venueName, t.location, t.venueAddress]
              .join(' ')
              .toLowerCase()
              .includes(x)
          );
        })
        .filter((t) => !event || (t.categories || []).some((c: any) => c.eventType === event))
        .filter((t) => statuses[view] === 'ALL' || listStatus(t) === statuses[view]),
    [q.data, search, event, view],
  );
  return (
    <ScreenContainer dark>
      <FlatList
        data={data}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={q.isFetching}
            onRefresh={() => q.refetch()}
            tintColor={colors.lime}
          />
        }
        keyExtractor={(x) => String(x.id)}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <>
            <View style={s.top}>
              <Text style={s.brand}>
                Smash<Text style={s.lime}>Point</Text>
              </Text>
              <Text style={s.role}>PLAYER</Text>
              <Pressable
                accessibilityLabel="Notifications"
                onPress={() => router.push('/(player)/notifications')}
              >
                <Text style={s.bell}>♧</Text>
              </Pressable>
            </View>
            <View style={s.hero}>
              <Text style={s.eyebrow}>FIND YOUR NEXT RALLY</Text>
              <Text style={s.heroTitle}>
                Tournaments{`\n`}
                <Text style={s.lime}>near you</Text>
              </Text>
              <Text style={s.heroCopy}>
                Browse open events, choose your category, and reserve your place on court.
              </Text>
              <Text style={s.heroMark}>⌁</Text>
            </View>
            <View style={s.filters}>
              <View style={s.search}>
                <Text style={s.searchIcon}>⌕</Text>
                <TextInput
                  testID="tournament-search"
                  accessibilityLabel="Search tournaments"
                  placeholder="Search by tournament or venue"
                  placeholderTextColor="#7C8B86"
                  value={search}
                  onChangeText={setSearch}
                  style={s.input}
                />
              </View>
              <Text style={s.filterLabel}>STATUS</Text>
              <View style={s.row}>
                {statuses.map((x, i) => (
                  <Pressable
                    key={x}
                    onPress={() => setView(i)}
                    style={[s.filter, view === i && s.filterActive]}
                  >
                    <Text style={[s.filterText, view === i && s.filterTextActive]}>
                      {x === 'OPEN'
                        ? 'Open registration'
                        : x === 'CLOSED'
                          ? 'Closed'
                          : x === 'COMPLETED'
                            ? 'Completed'
                            : 'All events'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.filterLabel}>FORMAT</Text>
              <View style={s.row}>
                {['', 'SINGLES', 'DOUBLES'].map((x) => (
                  <Pressable
                    key={x}
                    onPress={() => setEvent(x)}
                    style={[s.filter, event === x && s.filterActive]}
                  >
                    <Text style={[s.filterText, event === x && s.filterTextActive]}>
                      {x || 'All formats'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={s.summary}>
              <Text style={s.count}>
                {data.length} event{data.length === 1 ? '' : 's'} found
              </Text>
              <Text style={s.helper}>Select an event to register</Text>
            </View>
            <QueryState
              loading={q.isLoading}
              error={q.isError}
              empty={!q.isLoading && !q.isError && !data.length}
              onRetry={() => q.refetch()}
            />
          </>
        }
        renderItem={({ item }) => <TournamentResultCard item={item} />}
      />
      <BottomNav active="Tournaments" />
    </ScreenContainer>
  );
}
function TournamentResultCard({ item }: { item: any }) {
  const statusValue = listStatus(item);
  const categories = (item.categories || []).filter((category: any) => category?.id);
  const cats = categories.map((c: any) => c.eventType).filter(Boolean);
  const results = useResults();
  const fixtures = useQuery({
    queryKey: ['tournament-result', String(item.id)],
    queryFn: () => ops.fixtures(String(item.id)).then((response) => response.data),
    enabled: statusValue === 'COMPLETED',
  });
  const raw = Array.isArray(fixtures.data)
    ? fixtures.data
    : fixtures.data?.fixtures || fixtures.data?.data || fixtures.data?.items || [];
  const normalized = normalizeFixtureResponse(raw);
  const tone =
    statusValue === 'COMPLETED' ? 'completed' : statusValue === 'CLOSED' ? 'closed' : 'success';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/(player)/tournament/${item.id}`)}
      style={s.card}
    >
      <View style={s.cardInner}>
        <View style={s.badges}>
          <StatusBadge
            label={
              statusValue === 'OPEN'
                ? 'OPEN REGISTRATION'
                : statusValue === 'CLOSED'
                  ? 'REGISTRATION CLOSED'
                  : 'COMPLETED'
            }
            tone={tone}
          />
          {cats[0] && <Text style={s.format}>{cats[0]}</Text>}
        </View>
        <Text style={s.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={s.meta}>
          ⌖ {item.venue || item.venueName || item.location || 'Venue TBC'} · ◷{' '}
          {dateLabel(item.startDate || item.tournamentDate)}
        </Text>
        {statusValue === 'CLOSED' && (item.registrationCloseDate || item.registrationEndDate) ? (
          <Text style={s.close}>
            Registration closed on{' '}
            {dateLabel(item.registrationCloseDate || item.registrationEndDate)}
          </Text>
        ) : null}
        {statusValue === 'COMPLETED' &&
          categories.map((category: any) => (
            <ResultPanel
              key={category.id}
              categoryId={String(category.id)}
              fixtures={normalized}
              result={(results.data || []).find(
                (entry: any) =>
                  String(entry.tournamentId) === String(item.id) &&
                  String(entry.categoryId) === String(category.id),
              )}
              loading={fixtures.isLoading || results.isLoading}
              error={fixtures.isError}
            />
          ))}
        <View style={s.bottom}>
          <Text style={s.events}>{cats.join('  ·  ') || 'Tournament event'}</Text>
          <View style={s.cta}>
            <Text style={s.ctaText}>View tournament →</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
function ResultPanel({
  categoryId,
  fixtures,
  result,
  loading,
  error,
}: {
  categoryId: string;
  fixtures: any[];
  result: any;
  loading: boolean;
  error: boolean;
}) {
  const players = usePlayers();
  if (loading || players.isLoading)
    return <Text style={s.resultLoading}>Loading final result…</Text>;
  // /api/results is the backend-authoritative source (organizer/admin-corrected results included);
  // fixture-derived winner/runner-up is only a fallback for when a result hasn't been generated yet
  // but the final fixture is already completed.
  const resultNames = (key: string) =>
    participantNames(
      result?.[key] ||
        result?.[`${key}Participant`] ||
        result?.[`${key}Player`] ||
        result?.[`${key}Team`] ||
        result?.[`${key}ParticipantName`] ||
        result?.[`${key}Name`],
    );
  const final = findFinalFixture(
    fixtures.filter((fixture) => String(fixture.categoryId) === categoryId),
  );
  const fixtureWinner = getFixtureWinner(final, players.data || []);
  const fixtureRunnerUp = getFixtureRunnerUp(final, players.data || []);
  const apiWinner = resultNames('winner');
  const apiRunnerUp = resultNames('runnerUp');
  const resolvedWinner = apiWinner.length ? apiWinner : fixtureWinner;
  const resolvedRunnerUp = apiRunnerUp.length ? apiRunnerUp : fixtureRunnerUp;
  return (
    <View style={s.results}>
      <ResultCard
        gold
        label="🏆 Winner"
        names={resolvedWinner.length ? resolvedWinner : ['Winner unavailable']}
      />
      <ResultCard
        label="🥈 Runner-up"
        names={resolvedRunnerUp.length ? resolvedRunnerUp : ['Runner-up unavailable']}
      />
    </View>
  );
}
function ResultCard({ gold, label, names }: { gold?: boolean; label: string; names: string[] }) {
  return (
    <View style={[s.resultCard, gold ? s.winner : s.runner]}>
      <Text style={[s.resultLabel, gold ? s.goldText : s.silverText]}>{label}</Text>
      {names.map((name, i) => (
        <Text key={`${name}-${i}`} style={s.resultName} numberOfLines={2}>
          {name}
        </Text>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  list: { paddingBottom: 18 },
  top: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  brand: { color: colors.white, fontSize: 22, fontWeight: '900' },
  lime: { color: colors.lime },
  role: { color: colors.lime, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginLeft: 14 },
  bell: { color: colors.lime, fontSize: 21, marginLeft: 'auto' },
  hero: {
    backgroundColor: '#082B24',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0D6049',
    padding: 20,
    minHeight: 174,
    overflow: 'hidden',
  },
  eyebrow: { color: colors.lime, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  heroTitle: {
    color: colors.white,
    fontSize: 30,
    lineHeight: 33,
    fontWeight: '900',
    marginTop: 10,
  },
  heroCopy: { color: '#A8B6B1', fontSize: 13, lineHeight: 19, maxWidth: 270, marginTop: 10 },
  heroMark: {
    position: 'absolute',
    right: 17,
    bottom: 15,
    color: '#1D8060',
    fontSize: 66,
    opacity: 0.55,
  },
  filters: {
    backgroundColor: '#06251F',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#0D6049',
    padding: 14,
    marginTop: 14,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#031A16',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#18553F',
    paddingHorizontal: 12,
  },
  searchIcon: { color: colors.lime, fontSize: 22 },
  input: { flex: 1, color: colors.white, paddingVertical: 13, paddingHorizontal: 8, fontSize: 14 },
  filterLabel: {
    color: '#7C8B86',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: 14,
    marginBottom: 7,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  filter: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#18553F',
    backgroundColor: '#082B24',
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  filterActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  filterText: { color: '#A8B6B1', fontSize: 11, fontWeight: '800' },
  filterTextActive: { color: '#082B24' },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 18,
  },
  count: { color: colors.white, fontSize: 16, fontWeight: '900' },
  helper: { color: '#7C8B86', fontSize: 11 },
  card: {
    backgroundColor: '#06251F',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0D6049',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardInner: { padding: 16 },
  badges: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  format: {
    color: '#A8DCD0',
    backgroundColor: '#124C40',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 9,
    fontWeight: '900',
  },
  name: { color: colors.white, fontSize: 21, lineHeight: 25, fontWeight: '900' },
  meta: { color: '#A8B6B1', fontSize: 12, marginTop: 10 },
  close: { color: '#7C8B86', fontSize: 11, marginTop: 8 },
  results: { flexDirection: 'row', gap: 8, marginTop: 14 },
  resultCard: { flex: 1, borderRadius: 12, padding: 10, minHeight: 76 },
  winner: { backgroundColor: '#F4E8C7', borderWidth: 1, borderColor: '#D8B86A' },
  runner: { backgroundColor: '#E5EBF0', borderWidth: 1, borderColor: '#B8C3CC' },
  resultLabel: { fontSize: 10, fontWeight: '900', marginBottom: 6 },
  goldText: { color: '#996A16' },
  silverText: { color: '#526575' },
  resultName: { color: '#15231F', fontSize: 13, fontWeight: '800' },
  resultLoading: { color: '#A8B6B1', fontSize: 11, marginTop: 14 },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  events: { color: colors.lime, fontSize: 10, fontWeight: '900', flex: 1 },
  cta: {
    backgroundColor: colors.lime,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  ctaText: { color: '#082B24', fontSize: 11, fontWeight: '900' },
});
