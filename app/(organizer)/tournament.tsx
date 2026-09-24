import type { ReactNode } from 'react';
import { ImageBackground, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { BackButton } from '../../src/components/common/BackButton';
import { organizerApi } from '../../src/features/organizer/api';
import { ops } from '../../src/features/organizer/operations';
import { colors, radius, spacing } from '../../src/theme';
import { TournamentIcon, type TournamentIconName } from '../../src/components/common/TournamentIcon';
import {
  getTournamentDisplayStatus,
  tournamentStatusLabel,
} from '../../src/features/organizer/status';

export default function Tournament() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const queryClient = useQueryClient();
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
  const published = String(tournament.status).toUpperCase() === 'PUBLISHED';
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
                <TournamentIcon name={published ? 'check' : 'document'} size={13} />
                <Text style={[s.badgeText, { color: publicationStyle(tournament.status).color }]}>
                  {tournamentStatusLabel(tournament.status)}
                </Text>
              </View>
              {progress && (
                <View style={[s.badge, progressStyle(progress.type)]}>
                  <TournamentIcon name={progressIcon} size={13} />
                  <Text style={[s.badgeText, { color: progressStyle(progress.type).color }]}>
                    {progress.label}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={s.heroFade} />
        </ImageBackground>

        <View style={s.body}>
          <Section icon="calendar" title="Tournament details">
            <View style={s.infoCard}>
              <Info icon="calendar" label="Date" value={formatDate(tournament.startDate || tournament.tournamentDate)} />
              <Info icon="clock" label="Reporting time" value={tournament.reportingTime} />
              <Info icon="location" label="Venue" value={tournament.venue || tournament.venueName} />
              <Info icon="map" label="Address" value={tournament.location || tournament.venueAddress} />
              <Info icon="trophy" label="Format" value={tournament.format} />
              <Info
                icon="calendar"
                label="Registration closes"
                value={formatDate(tournament.registrationCloseDate || tournament.registrationEndDate)}
              />
              <Info icon="clock" label="Registration close time" value={tournament.registrationCloseTime} />
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

          <View style={s.card}>
            <Info icon="trophy" label="Prize" value={tournament.prize || tournament.prizeAmount || tournament.prizePool} />
            <View style={s.splitRow}>
              <Info icon="shuttle" label="Shuttle type" value={tournament.shuttleType || tournament.shuttle} half />
              <Info
                icon="settings"
                label="Scoring format"
                value={tournament.winningPoints ?? tournament.winning_points ?? tournament.scoringFormat}
                half
              />
            </View>
            <Pressable
              style={s.ctaButton}
              onPress={() => router.push({ pathname: '/(organizer)/fixtures', params: { id: String(id) } })}
            >
              <TournamentIcon name="bracket" size={18} />
              <Text style={s.ctaText}>View Fixtures</Text>
              <Text style={s.ctaArrow}>→</Text>
            </Pressable>
          </View>
        </View>

        <View style={s.footer}>
          <Text style={s.footerBrand}>
            Smash<Text style={s.footerLime}>Point</Text>
          </Text>
          <Text style={s.footerTagline}>More Than a Game</Text>
          <Text style={s.footerPlay}>PLAY  ·  COMPETE  ·  CONNECT</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function Section({ icon, title, children }: { icon: TournamentIconName; title: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeadingRow}>
        <View style={s.sectionIcon}>
          <TournamentIcon name={icon} size={16} />
        </View>
        <Text style={s.heading}>{title}</Text>
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
          <TournamentIcon name="people" size={18} />
          <Text style={s.categoryName}>{category.name || category.eventType || 'Category'}</Text>
        </View>
        {hasCount && (
          <View style={s.registeredPill}>
            <TournamentIcon name="people" size={13} />
            <Text style={s.registered}>{count} Registered</Text>
          </View>
        )}
      </View>
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
        <TournamentIcon name="people" size={18} />
        <Text style={s.ctaText}>View registrations & fixture shuffle</Text>
        <Text style={s.ctaArrow}>→</Text>
      </Pressable>
    </View>
  );
}

function Info({
  icon,
  label,
  value,
  half,
}: {
  icon?: TournamentIconName;
  label: string;
  value: unknown;
  half?: boolean;
}) {
  if (value == null || value === '') return null;
  return (
    <View style={[s.info, half && s.infoHalf]}>
      {icon && (
        <View style={s.infoIcon}>
          <TournamentIcon name={icon} size={14} />
        </View>
      )}
      <View style={s.infoCopy}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{String(value)}</Text>
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
  return String(status).toUpperCase() === 'PUBLISHED'
    ? { backgroundColor: 'rgba(138, 226, 52, 0.14)', borderColor: colors.lime, color: colors.lime }
    : { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: '#3A5C50', color: '#C6DDD1' };
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
  content: { paddingBottom: 44 },
  hero: { minHeight: 300, paddingTop: 8 },
  heroImage: { resizeMode: 'cover' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2, 27, 21, 0.6)' },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: -1, height: 30, backgroundColor: '#031A16' },
  heroTopRow: { paddingHorizontal: 20, paddingTop: 6 },
  heroBody: { paddingHorizontal: 20, marginTop: 14 },
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
  title: { color: colors.white, fontSize: 28, fontWeight: '900', lineHeight: 33 },
  code: { color: '#C6DDD1', fontSize: 12, marginTop: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
  body: { paddingHorizontal: 20 },
  section: { marginTop: 26 },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(138, 226, 52, 0.14)',
    borderWidth: 1,
    borderColor: '#2E6C56',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { color: colors.white, fontSize: 18, fontWeight: '900' },
  infoCard: {
    backgroundColor: '#EFF6F1',
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: { backgroundColor: '#EFF6F1', borderRadius: radius.lg, padding: spacing.lg, marginTop: 4 },
  bodyText: { color: '#243B32', lineHeight: 22, fontSize: 14 },
  muted: { color: '#5C776C' },
  info: { width: '100%', flexDirection: 'row', gap: 8, marginBottom: spacing.lg, paddingRight: spacing.sm },
  infoHalf: { width: '50%' },
  infoIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 122, 79, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  infoCopy: { flex: 1, minWidth: 0 },
  infoLabel: { color: '#5C776C', fontSize: 11, marginBottom: 3 },
  infoValue: { color: '#12211B', fontSize: 14, fontWeight: '800' },
  splitRow: { flexDirection: 'row', flexWrap: 'wrap' },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.medium,
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginTop: spacing.sm,
    shadowColor: colors.lime,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  ctaText: { color: colors.white, fontSize: 14, fontWeight: '900', flex: 1 },
  ctaArrow: { color: colors.white, fontSize: 16, fontWeight: '900' },
  category: {
    backgroundColor: '#EFF6F1',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: 8,
  },
  categoryHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  categoryName: {
    color: '#12211B',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  registeredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 122, 79, 0.12)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexShrink: 0,
  },
  registered: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  loading: { color: colors.white, fontSize: 20, fontWeight: '800', marginTop: spacing.section, marginHorizontal: spacing.lg },
  errorTitle: { color: colors.white, fontSize: 22, fontWeight: '900', marginTop: spacing.section, marginHorizontal: spacing.lg },
  retryButton: { backgroundColor: colors.primary, borderRadius: radius.medium, padding: spacing.lg, alignItems: 'center', marginHorizontal: spacing.lg, marginTop: spacing.md },
  retryButtonText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  footer: { alignItems: 'center', paddingTop: 40, paddingBottom: 20 },
  footerBrand: { color: colors.white, fontSize: 22, fontWeight: '900' },
  footerLime: { color: colors.lime },
  footerTagline: { color: '#8FA59B', fontSize: 12, marginTop: 4 },
  footerPlay: { color: '#5C776C', fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginTop: 14 },
});
