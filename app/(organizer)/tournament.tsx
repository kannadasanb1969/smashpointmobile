import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { organizerApi } from '../../src/features/organizer/api';
import { ops } from '../../src/features/organizer/operations';
import { colors, radius, shadows, spacing } from '../../src/theme';
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
        <Text style={s.errorTitle}>Tournament not found</Text>
      </ScreenContainer>
    );
  if (query.isLoading)
    return (
      <ScreenContainer dark>
        <Text style={s.loading}>Loading tournament details…</Text>
      </ScreenContainer>
    );
  if (query.isError)
    return (
      <ScreenContainer dark>
        <Text style={s.errorTitle}>Unable to load tournament details.</Text>
        <PrimaryButton title="Retry" onPress={() => query.refetch()} />
      </ScreenContainer>
    );
  const tournament = query.data;
  if (!tournament)
    return (
      <ScreenContainer dark>
        <Text style={s.errorTitle}>Tournament not found</Text>
      </ScreenContainer>
    );
  const progress = getTournamentDisplayStatus(tournament);
  const categories = Array.isArray(tournament.categories) ? tournament.categories : [];
  const registrationRows = Array.isArray(registrations.data) ? registrations.data : [];
  return (
    <ScreenContainer dark>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            tintColor={colors.lime}
            refreshing={query.isFetching || registrations.isFetching}
            onRefresh={refresh}
          />
        }
        contentContainerStyle={s.content}
      >
        <Text onPress={() => router.back()} style={s.back}>
          ‹ Back to tournaments
        </Text>
        <Text style={s.eyebrow}>ORGANIZER TOURNAMENT</Text>
        <Text style={s.title}>{tournament.name}</Text>
        {tournament.code && <Text style={s.code}>Tournament Code: {tournament.code}</Text>}
        <View style={s.badges}>
          <Text style={[s.badge, publicationStyle(tournament.status)]}>
            {tournamentStatusLabel(tournament.status)}
          </Text>
          {progress && (
            <Text style={[s.badge, progressStyle(progress.type)]}>{progress.label}</Text>
          )}
        </View>

        <SectionTitle title="Tournament details" />
        <View style={s.infoCard}>
          <Info
            label="Date"
            value={formatDate(tournament.startDate || tournament.tournamentDate)}
          />
          <Info label="Reporting time" value={tournament.reportingTime} />
          <Info label="Venue" value={tournament.venue || tournament.venueName} />
          <Info label="Address" value={tournament.location || tournament.venueAddress} />
          <Info label="Format" value={tournament.format} />
          <Info
            label="Registration closes"
            value={formatDate(tournament.registrationCloseDate || tournament.registrationEndDate)}
          />
          <Info label="Registration close time" value={tournament.registrationCloseTime} />
        </View>
        {(tournament.description || tournament.description === '') && (
          <>
            <SectionTitle title="Description" />
            <View style={s.card}>
              <Text style={s.body}>{tournament.description || 'No description provided.'}</Text>
            </View>
          </>
        )}

        <SectionTitle title="Categories" />
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
        <View style={s.card}>
          <Info
            label="Prize"
            value={tournament.prize || tournament.prizeAmount || tournament.prizePool}
          />
          <Info label="Shuttle type" value={tournament.shuttleType || tournament.shuttle} />
          <Info
            label="Scoring format"
            value={
              tournament.winningPoints ?? tournament.winning_points ?? tournament.scoringFormat
            }
          />
          <PrimaryButton
            title="View Fixtures"
            onPress={() =>
              router.push({ pathname: '/(organizer)/fixtures', params: { id: String(id) } })
            }
          />
        </View>
      </ScrollView>
    </ScreenContainer>
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
        <Text style={s.categoryName}>{category.name || category.eventType || 'Category'}</Text>
        {hasCount && <Text style={s.registered}>{count} Registered</Text>}
      </View>
      <Info label="Event type" value={category.eventType} />
      <Info
        label="Medalists allowed"
        value={booleanValue(category.medalistsAllowed ?? category.medalists_allowed)}
      />
      <Info
        label="Open players allowed"
        value={booleanValue(category.openPlayersAllowed ?? category.open_players_allowed)}
      />
      <Info
        label="Beginner only"
        value={booleanValue(category.beginnerOnly ?? category.beginner_only)}
      />
      <Info
        label="Pure beginner only"
        value={booleanValue(category.pureBeginnerOnly ?? category.pure_beginner_only)}
      />
      <PrimaryButton
        title="View registrations & fixture shuffle  →"
        onPress={() =>
          router.push({
            pathname: '/(organizer)/registrations',
            params: { id: tournamentId, categoryId },
          })
        }
      />
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={s.heading}>{title}</Text>;
}
function Info({ label, value }: { label: string; value: unknown }) {
  if (value == null || value === '') return null;
  return (
    <View style={s.info}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{String(value)}</Text>
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
    ? { backgroundColor: '#DDF6E7', color: colors.success }
    : { backgroundColor: '#E9EEEC', color: colors.secondary };
}
function progressStyle(type: string) {
  switch (type) {
    case 'completed':
      return { backgroundColor: '#E3EEF8', color: colors.info };
    case 'live':
      return { backgroundColor: '#D7F6E7', color: colors.sport };
    case 'closed':
      return { backgroundColor: '#FFF0D8', color: '#A86A0A' };
    default:
      return { backgroundColor: '#E8F8C9', color: colors.primaryDark };
  }
}

const s = StyleSheet.create({
  content: { paddingBottom: 44 },
  back: { color: '#B8D5C6', fontWeight: '800', marginTop: spacing.md },
  eyebrow: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginTop: spacing.xl,
  },
  title: { color: colors.white, fontSize: 30, fontWeight: '900', marginTop: spacing.sm },
  code: { color: '#C6DDD1', fontSize: 13, marginTop: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.lg },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heading: {
    color: colors.white,
    fontSize: 21,
    fontWeight: '900',
    marginTop: spacing.section,
    marginBottom: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    ...shadows.card,
  },
  info: { width: '50%', paddingRight: spacing.md, marginBottom: spacing.lg },
  infoLabel: { color: colors.muted, fontSize: 11, marginBottom: 3 },
  infoValue: { color: colors.text, fontSize: 14, fontWeight: '800' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  body: { color: colors.text, lineHeight: 22, fontSize: 14 },
  muted: { color: colors.muted },
  category: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  categoryName: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
    flex: 1,
  },
  registered: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  loading: { color: colors.white, fontSize: 20, fontWeight: '800', marginTop: spacing.section },
  errorTitle: { color: colors.white, fontSize: 22, fontWeight: '900', marginTop: spacing.section },
});
