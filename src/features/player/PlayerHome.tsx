import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { BottomNav } from '../../components/common/BottomNav';
import { useAuthStore } from '../../store/authStore';
import { useNotifications } from './notifications';
import { useRegistrations, useTournaments, useProfile } from './api';
import { colors, radius, spacing } from '../../theme';
import { GlobalUserMenu } from '../../components/common/GlobalUserMenu';
import { TournamentIcon } from '../../components/common/TournamentIcon';

const heroBg = require('../../../assets/images/login-badminton-bg.png');
const activeEntriesBg = require('../../../assets/images/image2.png');
const openEventsBg = require('../../../assets/images/image9.png');
const findPlayersBg = require('../../../assets/images/image4.png');
const newAlertsBg = require('../../../assets/images/image8.png');
const tournamentsBg = require('../../../assets/images/image5.png');
const registrationsBg = require('../../../assets/images/image7.png');

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
          <TournamentIcon name="shuttle" size={16} />
          <Pressable
            accessibilityLabel="Notifications"
            style={styles.bellButton}
            onPress={() => router.push('/(player)/notifications')}
          >
            <Text style={styles.bell}>♧</Text>
            {unread > 0 && <View style={styles.bellDot} />}
          </Pressable>
        </View>
        <ImageBackground source={heroBg} style={styles.hero} imageStyle={styles.heroImage}>
          <View style={styles.heroOverlay} pointerEvents="none" />
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>WELCOME BACK</Text>
            <Text style={styles.heroTitle}>Hi, {name} 👋</Text>
            <Text style={styles.heroSub}>Ready to own the court today?</Text>
          </View>
          <GlobalUserMenu embedded displayName={name} />
        </ImageBackground>
        <View style={styles.stats}>
          <Stat
            bg={activeEntriesBg}
            tint={styles.tintGreen}
            icon="shuttle"
            value={String(regs.length)}
            label="Active entries"
          />
          <Stat
            bg={openEventsBg}
            tint={styles.tintBlue}
            icon="trophy"
            value={String(events.length)}
            label="Open events"
          />
          <Stat
            bg={findPlayersBg}
            tint={styles.tintGold}
            icon="people"
            value="→"
            label="Find players"
            onPress={() => router.push('/(player)/players')}
          />
          <Stat
            bg={newAlertsBg}
            tint={styles.tintPurple}
            glyph="♧"
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
          <ImageBackground source={tournamentsBg} style={styles.emptyCard} imageStyle={styles.emptyCardImage}>
            <View style={styles.emptyCardOverlay} pointerEvents="none" />
            <TournamentIcon name="shuttle" size={26} />
            <Text style={styles.emptyTitle}>No open tournaments right now.</Text>
            <Text style={styles.emptySub}>New events will appear here. Stay tuned!</Text>
          </ImageBackground>
        )}
        <Section
          eyebrow="YOUR TOURNAMENT JOURNEY"
          title="My Registrations"
          onPress={() => router.push('/(player)/registrations')}
        />
        <ImageBackground source={registrationsBg} style={styles.registration} imageStyle={styles.registrationImage}>
          <View style={styles.registrationOverlay} pointerEvents="none" />
          {registrations.isLoading ? (
            <Text style={styles.muted}>Loading registrations…</Text>
          ) : regs.length ? (
            <Text style={styles.regText}>
              {regs.length} confirmed registration{regs.length === 1 ? '' : 's'} · View your entries
              →
            </Text>
          ) : (
            <>
              <TournamentIcon name="document" size={24} />
              <Text style={styles.regTitle}>Your confirmed entries will show here.</Text>
              <Text style={styles.regSub}>Register for tournaments and start your journey!</Text>
            </>
          )}
        </ImageBackground>
      </ScrollView>
      <BottomNav active="Home" />
    </ScreenContainer>
  );
}
function Stat({
  bg,
  tint,
  icon,
  glyph,
  value,
  label,
  onPress,
}: {
  bg: number;
  tint: object;
  icon?: any;
  glyph?: string;
  value: string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.stat}>
      <ImageBackground source={bg} style={styles.statBg} imageStyle={styles.statBgImage}>
        <View style={[styles.statTint, tint]} pointerEvents="none" />
        <View style={styles.statIconBadge}>
          {glyph ? <Text style={styles.statGlyph}>{glyph}</Text> : <TournamentIcon name={icon} size={18} />}
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statChevron}>›</Text>
      </ImageBackground>
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
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
  brand: { color: colors.white, fontSize: 22, fontWeight: '900' },
  brandAccent: { color: colors.lime },
  role: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginLeft: spacing.sm,
  },
  bellButton: { marginLeft: 'auto' },
  bell: { color: colors.white, fontSize: 20 },
  bellDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5484D',
  },
  hero: {
    minHeight: 132,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroImage: { borderRadius: radius.lg },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3, 26, 22, 0.55)' },
  heroCopy: { flex: 1 },
  eyebrow: { color: colors.lime, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  heroTitle: { color: colors.white, fontSize: 25, fontWeight: '900', marginTop: 8 },
  heroSub: { color: '#D7E7E0', fontSize: 13, marginTop: 6 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.md },
  stat: { width: '48%', borderRadius: radius.md, overflow: 'hidden', minHeight: 130 },
  statBg: { flex: 1, padding: 12, minHeight: 130 },
  statBgImage: { borderRadius: radius.md },
  statTint: { ...StyleSheet.absoluteFillObject },
  tintGreen: { backgroundColor: 'rgba(8, 45, 36, 0.6)' },
  tintBlue: { backgroundColor: 'rgba(15, 30, 70, 0.6)' },
  tintGold: { backgroundColor: 'rgba(60, 40, 5, 0.55)' },
  tintPurple: { backgroundColor: 'rgba(50, 15, 65, 0.55)' },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statGlyph: { color: colors.lime, fontSize: 18, fontWeight: '900' },
  statValue: { color: colors.white, fontSize: 27, fontWeight: '900', marginTop: 6 },
  statLabel: { color: '#E4EFE9', fontSize: 12, marginTop: 2 },
  statChevron: {
    position: 'absolute',
    right: 10,
    bottom: 8,
    color: colors.white,
    fontSize: 20,
    fontWeight: '900',
  },
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
  emptyCard: {
    minHeight: 150,
    borderRadius: radius.md,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyCardImage: { borderRadius: radius.md },
  emptyCardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3, 26, 22, 0.45)' },
  emptyTitle: { color: colors.white, fontWeight: '800', fontSize: 15, marginTop: spacing.sm, textAlign: 'center' },
  emptySub: { color: '#D7E7E0', fontSize: 12, marginTop: 4, textAlign: 'center' },
  registration: {
    minHeight: 150,
    borderRadius: radius.md,
    overflow: 'hidden',
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registrationImage: { borderRadius: radius.md },
  registrationOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3, 26, 22, 0.45)' },
  regText: { color: colors.white, fontWeight: '700' },
  regTitle: { color: colors.white, fontWeight: '800', fontSize: 15, marginTop: spacing.sm, textAlign: 'center' },
  regSub: { color: '#D7E7E0', fontSize: 12, marginTop: 4, textAlign: 'center' },
});
