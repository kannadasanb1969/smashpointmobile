import { ImageBackground, RefreshControl, ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { BackButton } from '../../src/components/common/BackButton';
import { ops } from '../../src/features/organizer/operations';
import { fixtureLabel } from '../../src/features/organizer/fixtureHelpers';
import { useTournament, usePlayers, useGuests } from '../../src/features/player/api';
import { colors, radius, spacing } from '../../src/theme';
import { normalizeFixtureResponse } from '../../src/features/player/tournamentResults';
import { TournamentIcon, type TournamentIconName } from '../../src/components/common/TournamentIcon';
import { getTournamentDisplayStatus, tournamentStatusLabel } from '../../src/features/organizer/status';

export default function Registrations() {
  const { id, categoryId } = useLocalSearchParams<{ id: string; categoryId?: string }>();
  const tournament = useTournament(id);
  const playersQuery = usePlayers();
  const guestsQuery = useGuests();
  const categories = tournament.data?.categories || [];
  const [selected, setSelected] = useState(categoryId || '');
  const selectedCategory =
    categories.find((category: any) => String(category.id) === String(selected)) || categories[0];
  const effectiveCategoryId = selectedCategory ? String(selectedCategory.id) : '';
  const registrationsQuery = useQuery({
    queryKey: ['organizer-registrations', id],
    queryFn: () => ops.registrations(id).then((response) => response.data),
    enabled: Boolean(id),
  });
  const fixturesQuery = useQuery({
    queryKey: ['organizer-fixtures', id, effectiveCategoryId],
    queryFn: () => ops.fixtures(id, effectiveCategoryId || undefined).then((response) => response.data),
    enabled: Boolean(id),
  });
  const players = Object.fromEntries(
    (playersQuery.data || []).map((x: any) => [String(x.id), x.name || x.fullName || x.displayName || '']),
  );
  const guests = Object.fromEntries(
    (guestsQuery.data || []).map((x: any) => [String(x.id), x.name || x.fullName || x.displayName || '']),
  );
  const rawRegistrations = registrationRows(registrationsQuery.data);
  const normalizedRegistrations = normalizeRegistrationRows(rawRegistrations);
  const registrations = filterRegistrationRows(
    normalizedRegistrations,
    effectiveCategoryId,
    selectedCategory?.eventType,
  );
  const fixtures = fixtureRows(fixturesQuery.data);
  const isDoubles = String(selectedCategory?.eventType || '').toUpperCase() === 'DOUBLES';
  const teams = isDoubles ? registrations.filter((r) => hasPartner(r)) : [];
  const unpaired = isDoubles ? registrations.filter((r) => !hasPartner(r)) : registrations;
  const playerCount = isDoubles ? teams.length * 2 + unpaired.length : registrations.length;
  const progress = tournament.data ? getTournamentDisplayStatus(tournament.data) : null;
  const loading = registrationsQuery.isLoading || tournament.isLoading;
  const refreshing = registrationsQuery.isFetching || fixturesQuery.isFetching || tournament.isFetching;
  const refresh = () => {
    void registrationsQuery.refetch();
    void fixturesQuery.refetch();
    void tournament.refetch();
  };
  const openFixtures = () =>
    router.push({ pathname: '/(organizer)/fixtures', params: { id: String(id), categoryId: effectiveCategoryId } });
  return (
    <ScreenContainer dark>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={s.scroll}
        refreshControl={<RefreshControl tintColor={colors.lime} refreshing={refreshing} onRefresh={refresh} />}
        contentContainerStyle={s.content}
      >
        <ImageBackground
          source={require('../../assets/images/login-badminton-bg.png')}
          style={s.hero}
          imageStyle={s.heroImage}
        >
          <View style={s.heroOverlay} />
          <View style={s.heroTopRow}>
            <BackButton variant="dark" />
          </View>
          <View style={s.heroBody}>
            <View style={s.eyebrowPill}>
              <Text style={s.eyebrow}>ORGANIZER TOURNAMENT</Text>
            </View>
            <Text style={s.title}>{tournament.data?.name || 'Tournament'}</Text>
            <Text style={s.subtitle}>
              {[selectedCategory?.eventType, tournament.data?.fixtureFormat || tournament.data?.format, progress?.label]
                .filter(Boolean)
                .join('  ·  ')}
            </Text>
          </View>
          <View style={s.heroFade} />
        </ImageBackground>

        <View style={s.body}>
          {categories.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
              {categories.map((category: any) => (
                <Pressable
                  key={category.id}
                  onPress={() => setSelected(String(category.id))}
                  style={[s.filter, String(category.id) === effectiveCategoryId && s.filterActive]}
                >
                  <Text style={[s.filterText, String(category.id) === effectiveCategoryId && s.filterTextActive]}>
                    {category.name || category.eventType || 'Category'}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {!loading && (
            <>
              <View style={s.stats}>
                <Stat icon="people" value={playerCount} label="Players" />
                <Stat icon="bracket" value={isDoubles ? teams.length : 0} label="Teams" />
                <Stat icon="trophy" value={fixtures.length} label="Fixtures" />
                <Stat icon="check" value={progress?.label || tournamentStatusLabel(tournament.data?.status)} label="Status" isText />
              </View>

              <View style={s.actionsRow}>
                <Pressable style={s.actionButton} onPress={openFixtures}>
                  <TournamentIcon name="bars" size={20} />
                  <Text style={s.actionTitle}>View Fixtures</Text>
                  <Text style={s.actionSubtitle}>Check upcoming matches</Text>
                </Pressable>
                <Pressable style={s.actionButton} onPress={openFixtures}>
                  <TournamentIcon name="clock" size={20} />
                  <Text style={s.actionTitle}>View Results</Text>
                  <Text style={s.actionSubtitle}>See match results</Text>
                </Pressable>
              </View>

              {isDoubles && (
                <View style={s.section}>
                  <View style={s.sectionHeadingRow}>
                    <TournamentIcon name="people" size={18} />
                    <Text style={s.heading}>Teams ({teams.length})</Text>
                    {unpaired.length > 0 && <Text style={s.unpairedHint}>{unpaired.length} unpaired</Text>}
                  </View>
                  {teams.length ? (
                    teams.map((registration: any) => (
                      <View key={registration.id} style={s.card}>
                        <Text style={s.cardText}>{registrationName(registration, players, guests)}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={s.emptyCard}>
                      <View style={s.emptyIcon}>
                        <TournamentIcon name="people" size={20} />
                      </View>
                      <View style={s.emptyCopy}>
                        <Text style={s.emptyTitle}>No teams formed yet</Text>
                        <Text style={s.emptyText}>Players will be grouped into teams during the draw.</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              <View style={s.section}>
                <View style={s.sectionHeadingRow}>
                  <TournamentIcon name="single" size={18} />
                  <Text style={s.heading}>{isDoubles ? `Unpaired Players (${unpaired.length})` : `Players (${unpaired.length})`}</Text>
                </View>
                {unpaired.length ? (
                  unpaired.map((registration: any) => (
                    <View key={registration.id} style={s.playerRow}>
                      <View style={s.playerAvatar}>
                        <TournamentIcon name="single" size={16} />
                      </View>
                      <Text style={s.playerName}>{registrationName(registration, players, guests)}</Text>
                      <Text style={s.playerChevron}>›</Text>
                    </View>
                  ))
                ) : (
                  <View style={s.card}>
                    <Text style={s.cardText}>
                      {registrationsQuery.isLoading ? 'Loading registrations…' : 'No registrations yet.'}
                    </Text>
                  </View>
                )}
              </View>

              <Pressable style={s.banner} onPress={openFixtures}>
                <View style={[s.bannerIcon, fixtures.length ? s.bannerIconReady : s.bannerIconPending]}>
                  <TournamentIcon name={fixtures.length ? 'check' : 'document'} size={20} />
                </View>
                <View style={s.bannerCopy}>
                  <Text style={s.bannerTitle}>{fixtures.length ? 'Fixtures Generated' : 'Fixtures not generated yet'}</Text>
                  <Text style={s.bannerText}>
                    {fixtures.length
                      ? `${fixtures.length} fixture${fixtures.length === 1 ? '' : 's'} are ready to play.`
                      : 'Open Fixtures to generate the draw for this category.'}
                  </Text>
                </View>
                <Text style={s.playerChevron}>›</Text>
              </Pressable>
            </>
          )}
          {loading && <Text style={s.muted}>Loading registrations…</Text>}
          {registrationsQuery.isError && (
            <Text onPress={() => registrationsQuery.refetch()} style={s.error}>
              Unable to load registrations. Tap to retry.
            </Text>
          )}
        </View>

        <View style={s.footer}>
          <Text style={s.footerBrand}>
            Smash<Text style={s.footerLime}>Point</Text>
          </Text>
          <Text style={s.footerTagline}>More Than a Game</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function Stat({ icon, value, label, isText }: { icon: TournamentIconName; value: number | string; label: string; isText?: boolean }) {
  return (
    <View style={s.stat}>
      <TournamentIcon name={icon} size={18} />
      <Text style={[s.statValue, isText && s.statValueText]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}
function hasPartner(registration: any) {
  return registration.partnerId != null;
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
    return categoryMatches && ['REGISTERED', 'CONFIRMED'].includes(status);
  });
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
const s = StyleSheet.create({
  scroll: { backgroundColor: '#031A16' },
  content: { paddingBottom: 44 },
  hero: { minHeight: 190, paddingTop: 8 },
  heroImage: { resizeMode: 'cover' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2, 27, 21, 0.6)' },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: -1, height: 26, backgroundColor: '#031A16' },
  heroTopRow: { paddingHorizontal: 20, paddingTop: 6 },
  heroBody: { paddingHorizontal: 20, marginTop: 12 },
  eyebrowPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.lime,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  eyebrow: { color: colors.lime, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.white, fontSize: 24, fontWeight: '900', lineHeight: 29 },
  subtitle: { color: '#C6DDD1', fontSize: 12, fontWeight: '700', marginTop: 8, letterSpacing: 0.3 },
  body: { paddingHorizontal: 20 },
  filters: { gap: 8, paddingVertical: 16 },
  filter: {
    backgroundColor: '#083127',
    borderColor: '#17614B',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  filterText: { color: '#C6DDD1', fontSize: 12, fontWeight: '800' },
  filterTextActive: { color: '#0B3324' },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(6, 45, 36, 0.9)',
    borderColor: '#17614B',
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginTop: 16,
  },
  stat: { width: '25%', alignItems: 'center', paddingVertical: 8, gap: 6 },
  statValue: { color: colors.white, fontSize: 20, fontWeight: '900' },
  statValueText: { fontSize: 13 },
  statLabel: { color: '#8FA59B', fontSize: 10, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(6, 45, 36, 0.9)',
    borderColor: '#17614B',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
  },
  actionTitle: { color: colors.white, fontSize: 14, fontWeight: '900', marginTop: 4 },
  actionSubtitle: { color: '#8FA59B', fontSize: 11 },
  section: { marginTop: 26 },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  heading: { color: colors.white, fontSize: 18, fontWeight: '900', flex: 1 },
  unpairedHint: { color: colors.lime, fontSize: 12, fontWeight: '800' },
  card: { backgroundColor: '#EFF6F1', borderRadius: radius.lg, padding: spacing.lg },
  cardText: { color: '#12211B', fontSize: 14, fontWeight: '700' },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#EFF6F1',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 122, 79, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emptyCopy: { flex: 1 },
  emptyTitle: { color: '#12211B', fontSize: 14, fontWeight: '900' },
  emptyText: { color: '#5C776C', fontSize: 12, marginTop: 2 },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#EFF6F1',
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    marginBottom: 8,
  },
  playerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(15, 122, 79, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerName: { flex: 1, color: '#12211B', fontSize: 14, fontWeight: '800' },
  playerChevron: { color: '#5C776C', fontSize: 18, fontWeight: '900' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#EFF6F1',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: 26,
  },
  bannerIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  bannerIconReady: { backgroundColor: colors.success },
  bannerIconPending: { backgroundColor: 'rgba(15, 122, 79, 0.14)' },
  bannerCopy: { flex: 1 },
  bannerTitle: { color: colors.success, fontSize: 14, fontWeight: '900' },
  bannerText: { color: '#5C776C', fontSize: 12, marginTop: 2 },
  muted: { color: '#B8D5C6', marginTop: spacing.lg },
  error: { color: '#FFB5B5', marginTop: spacing.lg },
  footer: { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  footerBrand: { color: colors.white, fontSize: 20, fontWeight: '900' },
  footerLime: { color: colors.lime },
  footerTagline: { color: '#8FA59B', fontSize: 12, marginTop: 4 },
});
