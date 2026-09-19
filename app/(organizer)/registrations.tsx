import { RefreshControl, ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { ops } from '../../src/features/organizer/operations';
import { groupFixtures, fixtureLabel } from '../../src/features/organizer/fixtureHelpers';
import { useTournament, usePlayers, useGuests } from '../../src/features/player/api';
import { colors, radius, shadows, spacing } from '../../src/theme';
import { normalizeFixtureResponse } from '../../src/features/player/tournamentResults';

export default function Registrations() {
  const { id, categoryId } = useLocalSearchParams<{ id: string; categoryId?: string }>();
  const [selected, setSelected] = useState(categoryId || '');
  const [fixtureTab, setFixtureTab] = useState<'BRACKET' | 'MATCHES'>('BRACKET');
  const tournament = useTournament(id);
  const playersQuery = usePlayers();
  const guestsQuery = useGuests();
  const registrationsQuery = useQuery({
    queryKey: ['organizer-registrations', id],
    queryFn: () => ops.registrations(id).then((response) => response.data),
    enabled: Boolean(id),
  });
  const fixturesQuery = useQuery({
    queryKey: ['organizer-fixtures', id],
    queryFn: () => ops.fixtures(id).then((response) => response.data),
    enabled: Boolean(id),
  });
  const players = Object.fromEntries(
    (playersQuery.data || []).map((x: any) => [
      String(x.id),
      x.name || x.fullName || x.displayName || '',
    ]),
  );
  const guests = Object.fromEntries(
    (guestsQuery.data || []).map((x: any) => [
      String(x.id),
      x.name || x.fullName || x.displayName || '',
    ]),
  );
  const rawRegistrations = registrationRows(registrationsQuery.data);
  const normalizedRegistrations = normalizeRegistrationRows(rawRegistrations);
  const selectedCategory = (tournament.data?.categories || []).find(
    (category: any) => String(category.id) === String(selected),
  );
  const registrations = filterRegistrationRows(
    normalizedRegistrations,
    selected,
    selectedCategory?.eventType,
  );
  const fixtures = filterFixtureRows(fixtureRows(fixturesQuery.data), selected);
  const groups = groupFixtures(fixtures as any);
  if (__DEV__) {
    const codeList = (rows: any[]) =>
      rows.map((row) => row.registrationCode || row.registration_code || row.code || row.id);
    console.log('[REG TRACE] raw', { codes: codeList(rawRegistrations), rows: rawRegistrations });
    console.log('[REG TRACE] normalized', {
      codes: codeList(normalizedRegistrations),
      rows: normalizedRegistrations,
    });
    console.log('[REG TRACE] filtered', {
      codes: codeList(registrations),
      names: registrations.map((row) => registrationName(row, players, guests)),
      rows: registrations,
    });
    console.log('[MOBILE FIXTURES] raw/filtered/rounds', {
      rawCount: fixtureRows(fixturesQuery.data).length,
      filteredCount: fixtures.length,
      rounds: groups.map((group) => group.round),
    });
  }
  return (
    <ScreenContainer dark>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            tintColor={colors.lime}
            refreshing={registrationsQuery.isFetching || fixturesQuery.isFetching}
            onRefresh={() => {
              void registrationsQuery.refetch();
              void fixturesQuery.refetch();
            }}
          />
        }
        contentContainerStyle={s.content}
      >
        <Text onPress={() => router.back()} style={s.back}>
          ‹ Back to tournament
        </Text>
        <Text style={s.eyebrow}>ORGANIZER MATCH CENTRE</Text>
        <Text style={s.title}>Registrations & Fixtures</Text>
        {tournament.data?.name && <Text style={s.tournament}>{tournament.data.name}</Text>}
        <View style={s.filters}>
          <Filter label="All Categories" active={!selected} onPress={() => setSelected('')} />
          {(tournament.data?.categories || []).map((category: any) => (
            <Filter
              key={category.id}
              label={category.name || category.eventType || 'Category'}
              active={String(category.id) === String(selected)}
              onPress={() => setSelected(String(category.id))}
            />
          ))}
        </View>
        <SectionTitle
          title={`Registrations${registrationsQuery.isLoading ? '' : ` (${registrations.length})`}`}
        />
        {registrationsQuery.isLoading && <Text style={s.muted}>Loading registrations…</Text>}
        {registrationsQuery.isError && <ErrorState onRetry={() => registrationsQuery.refetch()} />}
        {!registrationsQuery.isLoading && !registrationsQuery.isError && !registrations.length && (
          <Text style={s.muted}>No registrations yet.</Text>
        )}
        {registrations.map((registration: any) => (
          <RegistrationCard
            key={registration.id}
            registration={registration}
            players={players}
            guests={guests}
          />
        ))}
        <SectionTitle title="Fixture - Knockout" />
        <View style={s.tabs}>
          <Filter
            label="Bracket"
            active={fixtureTab === 'BRACKET'}
            onPress={() => setFixtureTab('BRACKET')}
          />
          <Filter
            label="Matches"
            active={fixtureTab === 'MATCHES'}
            onPress={() => setFixtureTab('MATCHES')}
          />
        </View>
        {fixturesQuery.isLoading && <Text style={s.muted}>Loading fixtures…</Text>}
        {fixturesQuery.isError && <ErrorState onRetry={() => fixturesQuery.refetch()} />}
        {!fixturesQuery.isLoading && !fixturesQuery.isError && !fixtures.length && (
          <Text style={s.muted}>No fixtures generated yet.</Text>
        )}
        {fixtureTab === 'BRACKET' ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.bracket}
          >
            {groups.map((group) => (
              <View key={group.round} style={s.roundColumn}>
                <Text style={s.round}>🏆 {group.round}</Text>
                {group.fixtures.map((fixture: any, index: number) => (
                  <FixtureCard
                    key={fixture.id || index}
                    fixture={fixture}
                    players={players}
                    guests={guests}
                  />
                ))}
              </View>
            ))}
          </ScrollView>
        ) : (
          groups.map((group) => (
            <View key={group.round}>
              <Text style={s.round}>🏆 {group.round}</Text>
              {group.fixtures.map((fixture: any, index: number) => (
                <FixtureCard
                  key={fixture.id || index}
                  fixture={fixture}
                  players={players}
                  guests={guests}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function RegistrationCard({
  registration,
  players,
  guests,
}: {
  registration: any;
  players: Record<string, string>;
  guests: Record<string, string>;
}) {
  const name = registrationName(registration, players, guests);
  return (
    <View style={s.card}>
      <Text style={s.player}>{name}</Text>
      <Text style={s.meta}>
        {registration.eventType || registration.category?.eventType || 'Registration'} ·{' '}
        {registration.registrationCode || registration.code || registration.id} ·{' '}
        {registration.status || '—'}
      </Text>
    </View>
  );
}
function FixtureCard({
  fixture,
  players,
  guests,
}: {
  fixture: any;
  players: Record<string, string>;
  guests: Record<string, string>;
}) {
  const first = participantName(
    fixture.player1 ||
      fixture.participant1 ||
      fixture.team1 ||
      fixture.participant1Name ||
      fixture.participant1_name,
    players,
    guests,
  );
  const second = participantName(
    fixture.player2 ||
      fixture.participant2 ||
      fixture.team2 ||
      fixture.participant2Name ||
      fixture.participant2_name,
    players,
    guests,
  );
  const status = fixture.status || fixture.matchStatus || '—';
  const a = fixture.participant1Score ?? fixture.participant1_score ?? fixture.scoreA ?? 0;
  const b = fixture.participant2Score ?? fixture.participant2_score ?? fixture.scoreB ?? 0;
  return (
    <View style={s.fixture}>
      <View style={s.fixtureTop}>
        <Text style={s.matchCode}>
          Match {fixture.matchNumber ?? fixture.matchOrder ?? fixture.matchCode ?? fixture.id}
        </Text>
        <Text style={[s.status, statusStyle(status)]}>{status}</Text>
      </View>
      <Text style={s.participant}>
        {first}
        <Text style={s.score}> {a}</Text>
      </Text>
      <Text style={s.participant}>
        {second}
        <Text style={s.score}> {b}</Text>
      </Text>
      <Text style={s.rule}>
        Playing to {fixture.winningPoints ?? fixture.winning_points ?? '—'} · Win by 2
      </Text>
      {fixture.id && (
        <PrimaryButton
          title={
            status === 'COMPLETED'
              ? 'View completed match'
              : status === 'LIVE'
                ? 'Score match'
                : 'Start / score match'
          }
          onPress={() =>
            router.push({
              pathname: '/(organizer)/matches/[id]',
              params: {
                id: String(fixture.id),
                tournamentId: String(fixture.tournamentId || ''),
                categoryId: String(fixture.categoryId || ''),
              },
            })
          }
        />
      )}
    </View>
  );
}
function registrationRows(value: any): any[] {
  const rows = Array.isArray(value)
    ? value
    : value?.registrations || value?.data || value?.items || [];
  return Array.isArray(rows) ? rows : rows?.registrations || rows?.items || [];
}
function normalizeRegistrationRows(rows: any[]): any[] {
  return rows
    .filter(Boolean)
    .map((row) => ({
      ...row,
      registrationCode: row.registrationCode ?? row.registration_code ?? row.code,
      tournamentId: row.tournamentId ?? row.tournament_id,
      categoryId:
        row.categoryId ??
        row.category_id ??
        row.tournamentCategoryId ??
        row.tournament_category_id ??
        row.category?.id,
      eventType:
        row.eventType ?? row.event_type ?? row.category?.eventType ?? row.category?.event_type,
      status: row.status ?? row.registrationStatus ?? row.registration_status,
      playerId: row.playerId ?? row.player_id ?? row.playerProfileId ?? row.player_profile_id,
      partnerId: row.partnerId ?? row.partner_id ?? row.guestPartnerId ?? row.guest_partner_id,
      partnerType: row.partnerType ?? row.partner_type,
    }));
}
function fixtureRows(value: any): any[] {
  const rows = Array.isArray(value)
    ? value
    : value?.fixtures || value?.data || value?.items || value?.matches || [];
  return normalizeFixtureResponse(rows);
}
function filterRegistrationRows(rows: any[], categoryId: string, eventType?: string) {
  return rows.filter((row) => {
    const status = String(row.status || '').toUpperCase();
    const category =
      row.categoryId ??
      row.category_id ??
      row.tournamentCategoryId ??
      row.tournament_category_id ??
      row.category?.id;
    const categoryMatches =
      !categoryId ||
      (category != null
        ? String(category) === String(categoryId)
        : String(row.eventType || '').toUpperCase() === String(eventType || '').toUpperCase());
    return categoryMatches && status === 'REGISTERED';
  });
}
function filterFixtureRows(rows: any[], categoryId: string) {
  return categoryId
    ? rows.filter(
        (row) =>
          String(row.categoryId ?? row.category_id ?? row.category?.id ?? '') ===
          String(categoryId),
      )
    : rows;
}
function registrationName(
  registration: any,
  players: Record<string, string>,
  guests: Record<string, string>,
) {
  const playerId =
    registration.playerId ??
    registration.player_id ??
    registration.playerProfileId ??
    registration.player_profile_id ??
    registration.userId ??
    registration.user_id;
  const primary =
    registration.player?.name ||
    registration.player?.fullName ||
    registration.player?.full_name ||
    registration.playerProfile?.name ||
    registration.playerProfile?.fullName ||
    registration.playerProfile?.full_name ||
    registration.playerName ||
    registration.player_name ||
    registration.user?.name ||
    registration.guestPlayer?.name ||
    (playerId != null ? players[String(playerId)] || guests[String(playerId)] : '');
  const partnerId =
    registration.partnerId ??
    registration.partner_id ??
    registration.guestPartnerId ??
    registration.guest_partner_id ??
    registration.partner?.id;
  const partnerType = String(
    registration.partnerType ?? registration.partner_type ?? registration.partner?.type ?? '',
  ).toUpperCase();
  const partner =
    registration.partner?.name ||
    registration.partner?.fullName ||
    registration.partner?.full_name ||
    registration.partnerName ||
    registration.partner_name ||
    registration.guestPartner?.name ||
    registration.guestPartner?.fullName ||
    registration.guestPartner?.full_name ||
    (partnerId != null
      ? partnerType === 'GUEST'
        ? guests[String(partnerId)]
        : players[String(partnerId)] || guests[String(partnerId)]
      : '');
  const members =
    registration.members ||
    registration.participants ||
    registration.team?.members ||
    registration.team?.players ||
    registration.teamMembers ||
    registration.team_members;
  if (Array.isArray(members)) {
    const names = members
      .map((member: any) => participantName(member, players, guests))
      .filter(Boolean);
    if (names.length) return names.join(' / ');
  }
  if (String(registration.eventType || registration.event_type || '').toUpperCase() === 'DOUBLES')
    return [primary, partner].filter(Boolean).join(' / ') || 'Player details unavailable';
  return primary || 'Player details unavailable';
}
function participantName(
  value: any,
  players: Record<string, string>,
  guests: Record<string, string>,
): string {
  if (value == null) return 'TBD';
  if (typeof value === 'string' || typeof value === 'number')
    return players[String(value)] || guests[String(value)] || String(value);
  if (Array.isArray(value))
    return value.map((item) => participantName(item, players, guests)).join(' / ');
  const direct =
    value.name ||
    value.fullName ||
    value.displayName ||
    value.playerName ||
    value.participantName ||
    value.teamName;
  if (direct) return direct;
  const id = value.playerId ?? value.player_id ?? value.profileId ?? value.profile_id ?? value.id;
  return id != null ? players[String(id)] || guests[String(id)] || String(id) : fixtureLabel(value);
}
function Filter({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[s.filter, active && s.filterActive]}>
      <Text style={[s.filterText, active && s.filterTextActive]}>{label}</Text>
    </Pressable>
  );
}
function SectionTitle({ title }: { title: string }) {
  return <Text style={s.heading}>{title}</Text>;
}
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View>
      <Text style={s.error}>Unable to load data.</Text>
      <Text onPress={onRetry} style={s.retry}>
        Retry
      </Text>
    </View>
  );
}
function statusStyle(status: string) {
  switch (String(status).toUpperCase()) {
    case 'LIVE':
      return { backgroundColor: '#D7F6E7', color: colors.sport };
    case 'COMPLETED':
      return { backgroundColor: '#E3EEF8', color: colors.info };
    default:
      return { backgroundColor: '#FFF0D8', color: '#A86A0A' };
  }
}
const s = StyleSheet.create({
  content: { paddingBottom: 44 },
  back: { color: '#B8D5C6', fontWeight: '800', marginTop: spacing.md },
  eyebrow: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginTop: spacing.xl,
  },
  title: { color: colors.white, fontSize: 28, fontWeight: '900', marginTop: spacing.sm },
  tournament: { color: '#C6DDD1', marginTop: spacing.sm },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xl },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  bracket: { gap: spacing.md, paddingBottom: spacing.md },
  roundColumn: { width: 250 },
  filter: {
    backgroundColor: '#164E3B',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterActive: { backgroundColor: colors.lime },
  filterText: { color: '#C6DDD1', fontSize: 12, fontWeight: '800' },
  filterTextActive: { color: colors.primaryDark },
  heading: {
    color: colors.white,
    fontSize: 21,
    fontWeight: '900',
    marginTop: spacing.section,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  player: { color: colors.text, fontSize: 17, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 13, marginTop: spacing.sm },
  muted: { color: '#B8D5C6', marginBottom: spacing.md },
  error: { color: '#FFB5B5' },
  retry: { color: colors.lime, fontWeight: '800', marginTop: spacing.sm },
  round: { color: colors.lime, fontSize: 16, fontWeight: '900', marginVertical: spacing.sm },
  fixture: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  fixtureTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  matchCode: { color: colors.primaryDark, fontWeight: '900' },
  status: {
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '900',
  },
  participant: { color: colors.text, fontSize: 16, fontWeight: '800', paddingVertical: spacing.sm },
  score: { color: colors.primary, fontSize: 20, fontWeight: '900' },
  rule: { color: colors.muted, fontSize: 12, marginVertical: spacing.md },
});
