import type { ReactNode } from 'react';
import { useState } from 'react';
import { Alert, ImageBackground, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { BackButton } from '../../src/components/common/BackButton';
import { SmashConfirmModal } from '../../src/components/common/SmashConfirmModal';
import { organizerApi, useOrganizerDelete } from '../../src/features/organizer/api';
import { ops } from '../../src/features/organizer/operations';
import { colors, radius, spacing } from '../../src/theme';
import { TournamentIcon, type TournamentIconName } from '../../src/components/common/TournamentIcon';
import {
  getTournamentDisplayStatus,
  tournamentStatusLabel,
} from '../../src/features/organizer/status';
import { prizeRows, registrationFeeLabel } from '../../src/features/organizer/prize';
import { organizerActions } from '../../src/features/organizer/helpers';
import { useAuthStore } from '../../src/store/authStore';
import { getContentAvailability } from '../../src/features/availability/contentAvailability';

export default function Tournament() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const authUserId = useAuthStore((state) => state.user?.id);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletedModalVisible, setDeletedModalVisible] = useState(false);
  const deleteMutation = useOrganizerDelete();
  const query = useQuery({
    queryKey: ['organizer-tournament', id],
    queryFn: () => organizerApi.detail(id as string),
    enabled: Boolean(id),
  });
  const registrations = useQuery({
    queryKey: ['organizer-registrations', id],
    queryFn: () => ops.registrations(id as string).then((response) => response.data),
    enabled: Boolean(id),
  });
  const fixtureQuery = useQuery({
    queryKey: ['organizer-fixtures-summary', id],
    queryFn: async () => {
      const rows = await Promise.all((query.data?.categories || []).map((category: any) => ops.fixtures(String(id), String(category.id)).then((response) => response.data)));
      return rows.flatMap((value: any) => Array.isArray(value) ? value : value?.fixtures || value?.data || value?.items || value?.matches || []);
    },
    enabled: Boolean(id && query.data?.categories?.length),
  });
  const refresh = async () => {
    await query.refetch();
    await registrations.refetch();
    await queryClient.invalidateQueries({ queryKey: ['organizer-tournaments'] });
  };
  if (!id)
    return (
      <ScreenContainer dark>
        <BackButton variant="dark" fallbackRoute="/(organizer)/" />
        <Text style={s.errorTitle}>Tournament not found</Text>
      </ScreenContainer>
    );
  if (query.isLoading)
    return (
      <ScreenContainer dark>
        <BackButton variant="dark" fallbackRoute="/(organizer)/" />
        <Text style={s.loading}>Loading tournament details…</Text>
      </ScreenContainer>
    );
  if (query.isError)
    return (
      <ScreenContainer dark>
        <BackButton variant="dark" fallbackRoute="/(organizer)/" />
        <Text style={s.errorTitle}>Unable to load tournament details.</Text>
        <Pressable style={s.retryButton} onPress={() => query.refetch()}>
          <Text style={s.retryButtonText}>Retry</Text>
        </Pressable>
      </ScreenContainer>
    );
  const tournament = query.data;
  if (!tournament)
    return (
      <ScreenContainer dark>
        <BackButton variant="dark" fallbackRoute="/(organizer)/" />
        <Text style={s.errorTitle}>Tournament not found</Text>
      </ScreenContainer>
    );
  const progress = getTournamentDisplayStatus(tournament);
  const categories = Array.isArray(tournament.categories) ? tournament.categories : [];
  const registrationRows = Array.isArray(registrations.data) ? registrations.data : [];
  const fixtureAvailability = getContentAvailability({ fixtures: Array.isArray(fixtureQuery.data) ? fixtureQuery.data : [] });
  const published = String(tournament.status).toUpperCase() === 'PUBLISHED';
  // Edit Tournament is only ever shown to the actual owning organizer, and only while the
  // existing backend lifecycle rule (updateTournament, tournament.service.js) would actually
  // allow the save — DRAFT/REJECTED. This mirrors that authoritative rule rather than
  // reintroducing it; the backend still re-checks both on every PUT regardless of this UI gate.
  const isOwner = Boolean(authUserId && tournament.organizerId && authUserId === tournament.organizerId);
  const canEdit = isOwner && organizerActions(tournament.status).canEdit;
  const canDelete = isOwner && organizerActions(tournament.status).canDelete;
  const confirmDelete = () => {
    if (deleteMutation.isPending || !id) return;
    deleteMutation.mutate(String(id), {
      onSuccess: () => {
        setDeleteModalVisible(false);
        setDeletedModalVisible(true);
      },
      onError: (e) => {
        setDeleteModalVisible(false);
        Alert.alert('Unable to delete tournament', e instanceof Error ? e.message : 'Please try again.');
      },
    });
  };
  const mapLink = String(tournament.mapLink || '').trim();
  const openMapLink = async () => {
    if (!mapLink) return;
    try {
      const supported = await Linking.canOpenURL(mapLink);
      if (!supported) throw new Error('Unsupported map link');
      await Linking.openURL(mapLink);
    } catch {
      Alert.alert('Unable to open map', 'This location link could not be opened.');
    }
  };
  const progressIcon: TournamentIconName =
    progress?.type === 'completed' ? 'check' : progress?.type === 'live' ? 'play' : progress?.type === 'closed' ? 'lock' : 'calendar';
  return (
    <ScreenContainer dark>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={s.scroll}
        refreshControl={
          <RefreshControl
            tintColor={colors.lime}
            refreshing={query.isFetching || registrations.isFetching}
            onRefresh={refresh}
          />
        }
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
            <Text style={s.title}>{tournament.name}</Text>
            {tournament.code && <Text style={s.code}>Tournament Code: {tournament.code}</Text>}
            <View style={s.badges}>
              <View style={[s.badge, publicationStyle(tournament.status)]}>
                <TournamentIcon name={published ? 'check' : 'medal'} size={11} />
                <Text style={[s.badgeText, { color: publicationStyle(tournament.status).color }]}>
                  {tournamentStatusLabel(tournament.status)}
                </Text>
              </View>
              {progress && (
                <>
                  <Text style={s.badgeDivider}>|</Text>
                  <View style={[s.badge, progressStyle(progress.type)]}>
                    <TournamentIcon name={progressIcon} size={11} />
                    <Text style={[s.badgeText, { color: progressStyle(progress.type).color }]}>
                      {progress.label}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
          <View style={s.heroFade} />
        </ImageBackground>

        <View style={s.body}>
          {(canEdit || canDelete) && (
            <Section icon="settings" title="Organizer Actions" action={<Text style={s.collapseChevron}>⌃</Text>}>
              <View style={s.actionsRow}>
                {canEdit && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Edit Tournament"
                    style={s.editButton}
                    onPress={() => router.push({ pathname: '/(organizer)/create', params: { id: String(id) } })}
                  >
                    <Text style={s.editButtonIcon}>✎</Text>
                    <Text style={s.editButtonText}>Edit Tournament</Text>
                  </Pressable>
                )}
                {canDelete && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Delete Tournament"
                    style={s.deleteButton}
                    onPress={() => setDeleteModalVisible(true)}
                  >
                    <Text style={s.deleteButtonIcon}>🗑</Text>
                    <Text style={s.deleteButtonText}>Delete Tournament</Text>
                  </Pressable>
                )}
              </View>
            </Section>
          )}

          <Section icon="calendar" title="Tournament details">
            <View style={s.infoCard}>
              <View style={s.splitRow}>
                <Info icon="calendar" label="Date" value={formatDate(tournament.startDate || tournament.tournamentDate)} halfFlex />
                <Info icon="clock" label="Reporting time" value={tournament.reportingTime} halfFlex />
              </View>
              <View style={s.divider} />
              <Info icon="location" label="Venue" value={tournament.venue || tournament.venueName} />
              <View style={s.divider} />
              <AddressInfo
                value={tournament.location || tournament.venueAddress}
                mapLink={mapLink}
                onOpenMap={openMapLink}
              />
              <View style={s.divider} />
              <Info
                icon="calendar"
                label="Registration closes"
                value={formatDate(tournament.registrationCloseDate || tournament.registrationEndDate)}
              />
            </View>
          </Section>

          {(tournament.description || tournament.description === '') && (
            <Section icon="document" title="Description">
              <View style={s.card}>
                <Text style={s.bodyText}>{tournament.description || 'No description provided.'}</Text>
              </View>
            </Section>
          )}

          <Section icon="people" title="Categories">
            {categories.map((category: any) => (
              <CategoryCard
                key={category.id}
                category={category}
                tournamentId={String(id)}
                registrations={registrationRows}
              />
            ))}
            {!categories.length && (
              <View style={s.card}>
                <Text style={s.muted}>No categories available.</Text>
              </View>
            )}
          </Section>

          <Section icon="trophy" title="Tournament info">
            <View style={s.infoCard}>
              <View style={s.splitRow}>
                <Info icon="document" label="Organizer mobile" value={tournament.organizerMobile} halfFlex />
                <Info icon="star" label="Registration fee" value={registrationFeeLabel(tournament)} halfFlex />
              </View>
              <View style={s.divider} />
              <PrizeInfo tournament={tournament} />
              <View style={s.divider} />
              <View style={s.splitRow}>
                <Info icon="shuttle" label="Shuttle type" value={tournament.shuttleType || tournament.shuttle} halfFlex />
                <Info
                  icon="settings"
                  label="Scoring format"
                  value={tournament.winningPoints ?? tournament.winning_points ?? tournament.scoringFormat}
                  halfFlex
                />
              </View>
              <Pressable
                accessibilityState={{ disabled: !fixtureAvailability.canViewFixtures }}
                disabled={!fixtureAvailability.canViewFixtures}
                style={[s.ctaButton, !fixtureAvailability.canViewFixtures && { opacity: 0.45 }]}
                onPress={() => { if (fixtureAvailability.canViewFixtures) router.push({ pathname: '/(organizer)/fixtures', params: { id: String(id) } }); }}
              >
                <TournamentIcon name="bracket" size={15} />
                <Text style={s.ctaText}>View Fixtures</Text>
                <Text style={s.ctaArrow}>→</Text>
              </Pressable>
            </View>
          </Section>
        </View>

        <View style={s.footer}>
          <Text style={s.footerBrand}>
            Smash<Text style={s.footerLime}>Point</Text>
          </Text>
          <Text style={s.footerTagline}>More Than a Game</Text>
          <Text style={s.footerPlay}>PLAY  ·  COMPETE  ·  CONNECT</Text>
        </View>
      </ScrollView>
      <SmashConfirmModal
        visible={deleteModalVisible}
        title="Delete Tournament?"
        message={`Are you sure you want to delete "${tournament.name}"?\n\nThis tournament will be permanently deleted. This action cannot be undone.`}
        confirmText="Delete Tournament"
        cancelText="Cancel"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModalVisible(false)}
      />
      <SmashConfirmModal
        visible={deletedModalVisible}
        title="Tournament Deleted"
        message="The tournament has been permanently deleted."
        icon="check"
        confirmText="OK"
        showCancel={false}
        variant="primary"
        onConfirm={() => {
          setDeletedModalVisible(false);
          router.replace('/(organizer)/');
        }}
        onCancel={() => {
          setDeletedModalVisible(false);
          router.replace('/(organizer)/');
        }}
      />
    </ScreenContainer>
  );
}

function Section({
  icon,
  title,
  action,
  children,
}: {
  icon: TournamentIconName;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeadingRow}>
        <View style={s.sectionIcon}>
          <TournamentIcon name={icon} size={14} />
        </View>
        <Text style={[s.heading, s.headingFlex]}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function CategoryCard({
  category,
  tournamentId,
  registrations,
}: {
  category: any;
  tournamentId: string;
  registrations: any[];
}) {
  const categoryId = String(category.id);
  const directCount =
    category.registrationCount ?? category.registrationsCount ?? category.registeredCount;
  const count =
    directCount ??
    registrations.filter(
      (row) =>
        String(
          row.categoryId ??
            row.category_id ??
            row.tournamentCategoryId ??
            row.tournament_category_id ??
            '',
        ) === categoryId,
    ).length;
  const hasCount =
    directCount != null ||
    registrations.some(
      (row) =>
        row.categoryId != null ||
        row.category_id != null ||
        row.tournamentCategoryId != null ||
        row.tournament_category_id != null,
    );
  return (
    <View style={s.category}>
      <View style={s.categoryHeader}>
        <View style={s.categoryHeaderLeft}>
          <TournamentIcon name="people" size={15} />
          <Text style={s.categoryName}>{category.name || category.eventType || 'Category'}</Text>
        </View>
        {hasCount && (
          <View style={s.registeredPill}>
            <TournamentIcon name="people" size={11} />
            <Text style={s.registered}>{count} Registered</Text>
          </View>
        )}
      </View>
      <View style={s.divider} />
      <View style={s.categoryGrid}>
        <Info icon="shuttle" label="Event type" value={category.eventType} half />
        <Info
          icon="medal"
          label="Medalists allowed"
          value={booleanValue(category.medalistsAllowed ?? category.medalists_allowed)}
          half
        />
        <Info
          icon="star"
          label="Beginner only"
          value={booleanValue(category.beginnerOnly ?? category.beginner_only)}
          half
        />
        <Info
          icon="bars"
          label="Pure beginner only"
          value={booleanValue(category.pureBeginnerOnly ?? category.pure_beginner_only)}
          half
        />
        <Info
          icon="people"
          label="Open players allowed"
          value={booleanValue(category.openPlayersAllowed ?? category.open_players_allowed)}
        />
      </View>
      <Pressable
        style={s.ctaButton}
        onPress={() =>
          router.push({
            pathname: '/(organizer)/registrations',
            params: { id: tournamentId, categoryId },
          })
        }
      >
        <TournamentIcon name="people" size={15} />
        <Text style={s.ctaText}>View registrations & fixture shuffle</Text>
        <Text style={s.ctaArrow}>→</Text>
      </Pressable>
    </View>
  );
}

function AddressInfo({
  value,
  mapLink,
  onOpenMap,
}: {
  value: unknown;
  mapLink: string;
  onOpenMap: () => void;
}) {
  if (value == null || value === '') return null;
  return (
    <View style={s.info}>
      <View style={s.infoIcon}>
        <TournamentIcon name="map" size={12} />
      </View>
      <View style={s.infoCopy}>
        <View style={s.addressHeaderRow}>
          <Text style={s.infoLabel}>Address</Text>
          {!!mapLink && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open in Maps"
              style={s.mapLinkButton}
              onPress={onOpenMap}
            >
              <TournamentIcon name="location" size={12} />
              <Text style={s.mapLinkButtonText}>Open in Maps</Text>
            </Pressable>
          )}
        </View>
        <Text style={s.infoValue}>{String(value)}</Text>
      </View>
    </View>
  );
}
function Info({
  icon,
  label,
  value,
  half,
  halfFlex,
}: {
  icon?: TournamentIconName;
  label: string;
  value: unknown;
  // `half`: fixed 50% width — for categoryGrid, which wraps more than 2 items across lines.
  // `halfFlex`: flex: 1 — for a splitRow pair (always exactly 2 items, never wraps); needed
  // because two fixed-50%-width siblings plus the parent's `gap` sum to slightly over 100% of
  // the container, which overflowed and stacked the pair on some screen widths.
  half?: boolean;
  halfFlex?: boolean;
}) {
  if (value == null || value === '') return null;
  return (
    <View style={[s.info, half && s.infoHalf, halfFlex && s.infoHalfFlex]}>
      {icon && (
        <View style={s.infoIcon}>
          <TournamentIcon name={icon} size={12} />
        </View>
      )}
      <View style={s.infoCopy}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{String(value)}</Text>
      </View>
    </View>
  );
}
function PrizeInfo({ tournament }: { tournament: any }) {
  const rows = prizeRows(tournament);
  const legacy = tournament.prizes || tournament.prize || tournament.prizeAmount || tournament.prizePool;
  if (!rows.length) return <Info icon="trophy" label="Prizes" value={legacy || 'No Prize'} />;
  return (
    <View style={s.info}>
      <View style={s.infoIcon}>
        <TournamentIcon name="trophy" size={12} />
      </View>
      <View style={s.infoCopy}>
        <Text style={s.infoLabel}>Prizes</Text>
        {rows.map((row) => (
          <Text key={row.label} style={s.prizeRowText}>
            {row.medal} {row.label} — {row.detail}
          </Text>
        ))}
      </View>
    </View>
  );
}
function formatDate(value: unknown) {
  if (!value) return undefined;
  const raw = String(value);
  const date = new Date(raw);
  return Number.isNaN(date.getTime())
    ? raw
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function booleanValue(value: unknown) {
  return value == null ? undefined : value ? 'Yes' : 'No';
}
function publicationStyle(status: string) {
  // Pre-publication states (WAITING FOR APPROVAL, etc.) use the same lime-outline treatment as the
  // progress badge, matching the reference — only PUBLISHED gets the brighter filled variant.
  return String(status).toUpperCase() === 'PUBLISHED'
    ? { backgroundColor: 'rgba(138, 226, 52, 0.22)', borderColor: colors.lime, color: colors.lime }
    : { backgroundColor: 'rgba(138, 226, 52, 0.1)', borderColor: colors.lime, color: colors.lime };
}
function progressStyle(type: string) {
  switch (type) {
    case 'completed':
      return { backgroundColor: 'rgba(59, 130, 196, 0.16)', borderColor: '#3B82C4', color: '#9CCBEE' };
    case 'live':
      return { backgroundColor: 'rgba(138, 226, 52, 0.14)', borderColor: colors.lime, color: colors.lime };
    case 'closed':
      return { backgroundColor: 'rgba(242, 163, 58, 0.16)', borderColor: '#F2A33A', color: '#F2A33A' };
    default:
      return { backgroundColor: 'rgba(138, 226, 52, 0.14)', borderColor: colors.lime, color: colors.lime };
  }
}

const s = StyleSheet.create({
  scroll: { backgroundColor: '#031A16' },
  content: { paddingBottom: 28 },
  hero: { minHeight: 230, paddingTop: 6 },
  heroImage: { resizeMode: 'cover' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2, 27, 21, 0.6)' },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: -1, height: 30, backgroundColor: '#031A16' },
  heroTopRow: { paddingHorizontal: 20, paddingTop: 4 },
  heroBody: { paddingHorizontal: 20, marginTop: 10 },
  eyebrowPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.lime,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 7,
  },
  eyebrow: { color: colors.lime, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: colors.white, fontSize: 23, fontWeight: '900', lineHeight: 27 },
  code: { color: '#C6DDD1', fontSize: 11, marginTop: 6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },
  badgeDivider: { color: '#3A5C50', fontSize: 13, marginTop: 5 },
  body: { paddingHorizontal: 20 },
  section: { marginTop: 14 },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  collapseChevron: { color: '#8FA59B', fontSize: 15, fontWeight: '900' },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  sectionIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: 'rgba(138, 226, 52, 0.14)',
    borderWidth: 1,
    borderColor: '#2E6C56',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { color: colors.white, fontSize: 15, fontWeight: '900' },
  headingFlex: { flex: 1 },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.lime,
    borderRadius: radius.medium,
    paddingVertical: 11,
  },
  editButtonIcon: { color: colors.lime, fontSize: 12 },
  editButtonText: { color: colors.lime, fontSize: 12, fontWeight: '900' },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: 'rgba(217, 76, 76, 0.1)',
    borderRadius: radius.medium,
    paddingVertical: 11,
  },
  deleteButtonIcon: { fontSize: 12 },
  deleteButtonText: { color: colors.error, fontSize: 12, fontWeight: '900' },
  infoCard: {
    backgroundColor: '#EFF6F1',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  card: { backgroundColor: '#EFF6F1', borderRadius: radius.lg, padding: spacing.sm, marginTop: 4 },
  bodyText: { color: '#243B32', lineHeight: 18, fontSize: 13 },
  muted: { color: '#5C776C' },
  divider: { height: 1, backgroundColor: 'rgba(18, 33, 27, 0.08)', marginBottom: spacing.xs },
  info: { width: '100%', flexDirection: 'row', gap: 7, marginBottom: spacing.sm, paddingRight: spacing.sm },
  // Fixed 50% width — used only inside categoryGrid, which wraps 4 of these plus one full-width
  // item across multiple lines; wrapping needs a fixed share of the container per item.
  infoHalf: { width: '50%' },
  // flex: 1 — used only inside a splitRow (always exactly 2 fixed items, never wraps). Two
  // 50%-width siblings plus the parent's `gap` sum to slightly MORE than 100% of the container,
  // which overflowed and stacked the pair on some screen widths; flex: 1 lets Yoga correctly
  // divide the space that's actually left after the gap, on every width.
  infoHalfFlex: { flex: 1 },
  infoIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: 'rgba(15, 122, 79, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  infoCopy: { flex: 1, minWidth: 0 },
  infoLabel: { color: '#5C776C', fontSize: 10, marginBottom: 2 },
  infoValue: { color: '#12211B', fontSize: 13, fontWeight: '800' },
  addressHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 },
  mapLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 0,
  },
  mapLinkButtonText: { color: colors.primary, fontWeight: '800', fontSize: 11 },
  prizeRowText: { color: '#12211B', fontSize: 12, fontWeight: '800', marginTop: 1 },
  splitRow: { flexDirection: 'row', gap: 8 },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.medium,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: spacing.xs,
    shadowColor: colors.lime,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  ctaText: { color: colors.white, fontSize: 13, fontWeight: '900', flex: 1 },
  ctaArrow: { color: colors.white, fontSize: 15, fontWeight: '900' },
  category: {
    backgroundColor: '#EFF6F1',
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    gap: 8,
  },
  categoryHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  categoryName: {
    color: '#12211B',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  registeredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 122, 79, 0.12)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  registered: { color: colors.primary, fontSize: 10, fontWeight: '900' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  loading: { color: colors.white, fontSize: 20, fontWeight: '800', marginTop: spacing.section, marginHorizontal: spacing.lg },
  errorTitle: { color: colors.white, fontSize: 22, fontWeight: '900', marginTop: spacing.section, marginHorizontal: spacing.lg },
  retryButton: { backgroundColor: colors.primary, borderRadius: radius.medium, padding: spacing.lg, alignItems: 'center', marginHorizontal: spacing.lg, marginTop: spacing.md },
  retryButtonText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  footer: { alignItems: 'center', paddingTop: 22, paddingBottom: 14 },
  footerBrand: { color: colors.white, fontSize: 18, fontWeight: '900' },
  footerLime: { color: colors.lime },
  footerTagline: { color: '#8FA59B', fontSize: 11, marginTop: 3 },
  footerPlay: { color: '#5C776C', fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginTop: 10 },
});
