import { RefreshControl, ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { useAuthStore } from '../../src/store/authStore';
import { authApi } from '../../src/api/apiClient';
import { useOrganizerTournaments } from '../../src/features/organizer/api';
import { colors, radius, shadows, spacing } from '../../src/theme';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import {
  getTournamentDisplayStatus,
  tournamentStatusLabel,
} from '../../src/features/organizer/status';

export default function Organizer() {
  const u = useAuthStore((s) => s.user);
  const q = useOrganizerTournaments(u?.id || '');
  const rows = q.data || [];
  const publishedCount = rows.filter((x: any) => x.status === 'PUBLISHED').length;
  return (
    <ScreenContainer dark>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            tintColor={colors.lime}
            refreshing={q.isFetching}
            onRefresh={() => q.refetch()}
          />
        }
        contentContainerStyle={s.content}
      >
        <View pointerEvents="none" style={s.courtLines}>
          <View style={s.lineHorizontal} />
          <View style={s.lineVertical} />
        </View>
        <Text style={s.brand}>
          Smash<Text style={s.brandAccent}>Point</Text>
        </Text>
        <Text style={s.kicker}>ORGANIZER WORKSPACE</Text>
        <View style={s.hero}>
          <View style={s.heroGlow} />
          <Text style={s.title}>Your tournaments</Text>
          <Text style={s.copy}>Manage tournaments, registrations, fixtures and live scores.</Text>
          <View style={s.statsRow}>
            <View style={s.stat}>
              <Text style={s.statValue}>{rows.length}</Text>
              <Text style={s.statLabel}>TOURNAMENTS</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text style={s.statValue}>{publishedCount}</Text>
              <Text style={s.statLabel}>PUBLISHED</Text>
            </View>
          </View>
        </View>
        <View style={s.actions}>
          <View style={s.createCard}>
            <View style={s.actionCopy}>
              <Text style={s.createTitle}>Create tournament</Text>
              <Text style={s.createSubtitle}>Start a new badminton event</Text>
            </View>
            <PrimaryButton title="＋  Create" onPress={() => router.push('/(organizer)/create')} />
          </View>
          <Pressable
            onPress={() => router.push('/(organizer)/notifications')}
            style={s.notificationCard}
          >
            <Text style={s.bell}>🔔</Text>
            <View>
              <Text style={s.notificationTitle}>Notifications</Text>
              <Text style={s.notificationSubtitle}>View organizer updates</Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </Pressable>
        </View>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>My tournaments</Text>
          <Text style={s.sectionCount}>
            {rows.length} {rows.length === 1 ? 'tournament' : 'tournaments'}
          </Text>
        </View>
        <View style={s.list}>
          {rows.map((x: any) => {
            const progress = getTournamentDisplayStatus(x);
            return (
              <Pressable
                key={x.id}
                style={s.card}
                onPress={() =>
                  router.push({ pathname: '/(organizer)/tournament', params: { id: x.id } })
                }
              >
                <View style={s.cardTop}>
                  <View style={s.badges}>
                    <Text style={[s.status, statusStyle(x.status)]}>
                      {tournamentStatusLabel(x.status)}
                    </Text>
                    {progress && (
                      <Text style={[s.status, progressStyle(progress.type)]}>{progress.label}</Text>
                    )}
                  </View>
                  <Text style={s.date}>{x.startDate || x.tournamentDate || 'Date not set'}</Text>
                </View>
                <Text style={s.name}>{x.name}</Text>
                <View style={s.cardBottom}>
                  <Text style={s.event}>🏸 Badminton tournament</Text>
                  <Text style={s.view}>View tournament ›</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        {!q.isLoading && !q.isError && !rows.length && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🏸</Text>
            <Text style={s.emptyTitle}>No tournaments yet</Text>
            <Text style={s.emptyCopy}>
              Create your first tournament and start organizing matches.
            </Text>
            <PrimaryButton
              title="Create tournament"
              onPress={() => router.push('/(organizer)/create')}
            />
          </View>
        )}
        <Text
          onPress={async () => {
            try { await authApi.logout(); } catch { /* local logout must still complete */ }
            await useAuthStore.getState().clearSession();
            router.replace('/(auth)/login');
          }}
          style={s.logout}
        >
          Log out
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function statusStyle(status: string) {
  switch (status) {
    case 'PUBLISHED':
    case 'APPROVED':
      return { backgroundColor: '#DDF6E7', color: colors.success };
    case 'COMPLETED':
      return { backgroundColor: '#E3EEF8', color: colors.info };
    case 'PENDING':
    case 'PENDING_ADMIN_APPROVAL':
      return { backgroundColor: '#FFF0D8', color: '#A86A0A' };
    case 'REJECTED':
      return { backgroundColor: '#FBE2E2', color: colors.error };
    default:
      return { backgroundColor: '#E9EEEC', color: colors.secondary };
  }
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
  content: { paddingTop: spacing.lg, paddingBottom: 40 },
  brand: { color: colors.white, fontSize: 22, fontWeight: '900' },
  brandAccent: { color: colors.lime },
  kicker: {
    color: '#B8D5C6',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginTop: spacing.xl,
  },
  courtLines: { ...StyleSheet.absoluteFillObject, opacity: 0.08 },
  lineHorizontal: {
    position: 'absolute',
    left: -24,
    right: -24,
    top: 210,
    height: 1,
    backgroundColor: colors.lime,
  },
  lineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1,
    backgroundColor: colors.lime,
  },
  hero: {
    overflow: 'hidden',
    backgroundColor: colors.primaryDark,
    borderColor: '#286B50',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginTop: spacing.md,
  },
  heroGlow: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: colors.sport,
    opacity: 0.16,
    right: -50,
    top: -70,
  },
  title: { color: colors.white, fontSize: 30, fontWeight: '900' },
  copy: { color: '#C6DDD1', fontSize: 14, lineHeight: 21, marginTop: spacing.sm, maxWidth: 290 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl },
  stat: { minWidth: 90 },
  statValue: { color: colors.lime, fontSize: 24, fontWeight: '900' },
  statLabel: { color: '#B8D5C6', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  statDivider: { backgroundColor: '#5B9076', height: 32, width: 1, marginHorizontal: spacing.lg },
  actions: { gap: spacing.md, marginTop: spacing.xl },
  createCard: {
    backgroundColor: colors.lime,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.button,
  },
  actionCopy: { flex: 1, paddingLeft: spacing.xs },
  createTitle: { color: colors.primaryDark, fontSize: 16, fontWeight: '900' },
  createSubtitle: { color: colors.primaryDark, opacity: 0.7, fontSize: 12, marginTop: 3 },
  notificationCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.card,
  },
  bell: { color: colors.primary, fontSize: 25, marginRight: spacing.md },
  notificationTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  notificationSubtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  chevron: { color: colors.primary, fontSize: 28, marginLeft: 'auto' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.section,
    marginBottom: spacing.md,
  },
  sectionTitle: { color: colors.white, fontSize: 21, fontWeight: '900' },
  sectionCount: { color: '#B8D5C6', fontSize: 12 },
  list: { gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    flex: 1,
    paddingRight: spacing.sm,
  },
  status: {
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  date: { color: colors.muted, fontSize: 12, paddingTop: 5 },
  name: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: spacing.lg },
  cardBottom: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  event: { color: colors.secondary, fontSize: 12 },
  view: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadows.card,
  },
  emptyIcon: { fontSize: 30 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: spacing.sm },
  emptyCopy: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginVertical: spacing.md,
  },
  logout: { color: '#B8D5C6', fontWeight: '800', textAlign: 'center', marginTop: spacing.section },
});
