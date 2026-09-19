import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { BottomNav } from '../../components/common/BottomNav';
import { useAuthStore } from '../../store/authStore';
import { useNotifications } from './notifications';
import { useRegistrations, useTournaments, useProfile } from './api';
import { colors, radius, spacing } from '../../theme';

export default function PlayerHome() {
  const user = useAuthStore((s) => s.user);
  const profileId = user?.playerProfile?.id || '';
  const tournaments = useTournaments({ status: 'PUBLISHED' });
  const registrations = useRegistrations(profileId);
  const notifications = useNotifications(user?.id || '');
  const profile = useProfile(profileId);
  const name = profile.data?.fullName || user?.name || user?.fullName || 'Player';
  const events = (tournaments.data || []).slice(0, 3) as any[];
  const regs = (registrations.data || []) as any[];
  const unread = typeof notifications.unread.data === 'number' ? notifications.unread.data : 0;
  const dateParts = (value?: string) => {
    const d = value ? new Date(value) : null;
    return d && !Number.isNaN(d.getTime())
      ? { day: d.getDate(), month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase() }
      : { day: '—', month: 'DATE' };
  };
  return (
    <ScreenContainer dark>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>
            Smash<Text style={styles.brandAccent}>Point</Text>
          </Text>
          <Text style={styles.role}>PLAYER</Text>
          <Pressable
            accessibilityLabel="Notifications"
            onPress={() => router.push('/(player)/notifications')}
          >
            <Text style={styles.bell}>♧ {unread ? unread : ''}</Text>
          </Pressable>
        </View>
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>WELCOME BACK</Text>
            <Text style={styles.heroTitle}>Hi, {name} 👋</Text>
            <Text style={styles.heroSub}>Ready to own the court today?</Text>
          </View>
          {profile.data?.profilePhoto ? (
            <Image source={{ uri: profile.data.profilePhoto }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.stats}>
          <Stat icon="◉" value={String(regs.length)} label="Active entries" />
          <Stat icon="♛" value={String(events.length)} label="Open events" />
          <Stat
            icon="♙"
            value="→"
            label="Find players"
            onPress={() => router.push('/(player)/players')}
          />
          <Stat
            icon="♧"
            value={String(unread)}
            label="New alerts"
            onPress={() => router.push('/(player)/notifications')}
          />
        </View>
        <Section
          eyebrow="STEP ONTO THE COURT"
          title="Open Tournaments"
          onPress={() => router.push('/(player)/tournaments')}
        />
        {tournaments.isLoading ? (
          <Text style={styles.muted}>Loading tournaments…</Text>
        ) : tournaments.isError ? (
          <Text style={styles.error}>Unable to load tournaments. Pull to retry.</Text>
        ) : events.length ? (
          events.map((item) => <TournamentCard key={item.id} item={item} dateParts={dateParts} />)
        ) : (
          <Text style={styles.empty}>No open tournaments right now.</Text>
        )}
        <Section
          eyebrow="YOUR TOURNAMENT JOURNEY"
          title="My Registrations"
          onPress={() => router.push('/(player)/registrations')}
        />
        <View style={styles.registration}>
          {registrations.isLoading ? (
            <Text style={styles.muted}>Loading registrations…</Text>
          ) : regs.length ? (
            <Text style={styles.regText}>
              {regs.length} confirmed registration{regs.length === 1 ? '' : 's'} · View your entries
              →
            </Text>
          ) : (
            <>
              <Text style={styles.regIcon}>◌</Text>
              <Text style={styles.muted}>Your confirmed entries will show here.</Text>
            </>
          )}
        </View>
      </ScrollView>
      <BottomNav active="Home" />
    </ScreenContainer>
  );
}
function Stat({
  icon,
  value,
  label,
  onPress,
}: {
  icon: string;
  value: string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.stat}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}
function Section({
  eyebrow,
  title,
  onPress,
}: {
  eyebrow: string;
  title: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.sectionRow}>
      <View>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Pressable onPress={onPress}>
        <Text style={styles.viewAll}>View all ›</Text>
      </Pressable>
    </View>
  );
}
function TournamentCard({
  item,
  dateParts,
}: {
  item: any;
  dateParts: (value?: string) => { day: number | string; month: string };
}) {
  const d = dateParts(item.startDate || item.tournamentDate);
  const status = (item.registrationPhase || item.status || '').toString().toUpperCase();
  const open = status.includes('OPEN') || status === 'PUBLISHED';
  return (
    <Pressable
      onPress={() => router.push(`/(player)/tournament/${item.id}`)}
      style={styles.tournament}
    >
      <View style={styles.date}>
        <Text style={styles.day}>{d.day}</Text>
        <Text style={styles.month}>{d.month}</Text>
      </View>
      <View style={styles.tournamentInfo}>
        <Text style={[styles.badge, open && styles.badgeOpen]}>
          {open ? 'OPEN REGISTRATION' : status || 'UPCOMING'}
        </Text>
        <Text style={styles.tName} numberOfLines={1}>
          {item.name || 'Tournament'}
        </Text>
        <Text style={styles.meta}>
          {item.venue || item.venueName || item.location || 'Venue TBC'} ·{' '}
          {(item.categories || []).length || 0} Categories
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  content: { paddingTop: spacing.md, paddingBottom: spacing.xl },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  brand: { color: colors.white, fontSize: 22, fontWeight: '900' },
  brandAccent: { color: colors.lime },
  role: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginLeft: spacing.md,
  },
  bell: { color: colors.lime, fontSize: 20, marginLeft: 'auto' },
  hero: {
    minHeight: 132,
    borderRadius: radius.lg,
    backgroundColor: '#082D24',
    borderWidth: 1,
    borderColor: '#0D6049',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroCopy: { flex: 1 },
  eyebrow: { color: colors.lime, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  heroTitle: { color: colors.white, fontSize: 25, fontWeight: '900', marginTop: 8 },
  heroSub: { color: '#A7B7B1', fontSize: 13, marginTop: 6 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#164D3B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.lime,
  },
  initial: { color: colors.lime, fontSize: 26, fontWeight: '900' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.md },
  stat: {
    width: '48%',
    backgroundColor: '#062820',
    borderWidth: 1,
    borderColor: '#0D6049',
    borderRadius: radius.md,
    padding: 12,
    minHeight: 104,
  },
  statIcon: { color: colors.lime, fontSize: 20 },
  statValue: { color: colors.white, fontSize: 27, fontWeight: '900', marginTop: 6 },
  statLabel: { color: '#A7B7B1', fontSize: 12, marginTop: 2 },
  sectionRow: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: colors.white, fontSize: 21, fontWeight: '900', marginTop: 5 },
  viewAll: { color: colors.lime, fontWeight: '800', fontSize: 12 },
  tournament: {
    backgroundColor: '#082D24',
    borderWidth: 1,
    borderColor: '#0D6049',
    borderRadius: radius.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  date: {
    backgroundColor: '#0A392C',
    borderRadius: 10,
    width: 58,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: { color: colors.white, fontSize: 25, fontWeight: '900' },
  month: { color: colors.lime, fontSize: 10, fontWeight: '900', marginTop: 2 },
  tournamentInfo: { flex: 1, marginLeft: 12 },
  badge: { color: '#A7B7B1', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  badgeOpen: { color: colors.lime },
  tName: { color: colors.white, fontSize: 16, fontWeight: '800', marginTop: 7 },
  meta: { color: '#A7B7B1', fontSize: 11, marginTop: 5 },
  chevron: { color: colors.lime, fontSize: 28, marginLeft: 6 },
  muted: { color: '#A7B7B1', fontSize: 13 },
  error: { color: '#FF8D8D', fontSize: 13 },
  empty: { color: '#A7B7B1', padding: 16 },
  registration: {
    minHeight: 86,
    borderWidth: 1,
    borderColor: '#0D6049',
    borderRadius: radius.md,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#062820',
  },
  regIcon: { color: colors.lime, fontSize: 22, marginBottom: 5 },
  regText: { color: colors.white, fontWeight: '700' },
});
