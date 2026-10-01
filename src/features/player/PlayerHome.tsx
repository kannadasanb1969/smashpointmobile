import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { BottomNav } from '../../components/common/BottomNav';
import { useAuthStore } from '../../store/authStore';
import { useNotifications } from './notifications';
import { useActiveRegistrations, useRegistrations, useTournaments, useProfile } from './api';
import { colors, radius, spacing } from '../../theme';
import { GlobalUserMenu } from '../../components/common/GlobalUserMenu';
import { TournamentIcon } from '../../components/common/TournamentIcon';
import { registrationFeeLabel } from '../organizer/prize';
import { getTournamentDisplayStatus } from '../organizer/status';

const heroBg = require('../../../assets/images/login-badminton-bg.png');
const activeEntriesBg = require('../../../assets/images/image2.png');
const openEventsBg = require('../../../assets/images/image9.png');
const findPlayersBg = require('../../../assets/images/image4.png');
const newAlertsBg = require('../../../assets/images/image8.png');
const tournamentsBg = require('../../../assets/images/image5.png');

export default function PlayerHome() {
  const user = useAuthStore((s) => s.user);
  const profileId = user?.playerProfile?.id || '';
  const tournaments = useTournaments({ status: 'PUBLISHED' });
  const registrations = useRegistrations(profileId);
  const activeRegistrations = useActiveRegistrations(profileId);
  const notifications = useNotifications(user?.id || '');
  const profile = useProfile(profileId);
  const name = profile.data?.fullName || user?.name || user?.fullName || 'Player';
  // "Open Tournaments"/"Open events" must exclude genuinely finished tournaments — tournament.status
  // never progresses past 'PUBLISHED' (there is no COMPLETED lifecycle status column), so the
  // {status:'PUBLISHED'} API filter above includes completed tournaments too; completionStatus
  // (same authoritative field tournaments.tsx/tournament/[id].tsx already key off) is what
  // actually distinguishes them.
  const events = (tournaments.data || [])
    .filter((item: any) => getTournamentDisplayStatus(item)?.type !== 'completed')
    .slice(0, 3) as any[];
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
            accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
            style={styles.bellButton}
            onPress={() => router.push('/(player)/notifications')}
          >
            <Text style={styles.bell}>♧</Text>
            {unread > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
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
            value={String(activeRegistrations.data?.length || 0)}
            label="Active entries"
            onPress={() => router.push({ pathname: '/(player)/registrations', params: { filter: 'active' } })}
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
            icon="document"
            value={String(regs.length)}
            label="My Entries"
            onPress={() => router.push({ pathname: '/(player)/registrations', params: { filter: 'all' } })}
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
  // tournament.status never progresses past 'PUBLISHED' — it's not a completion signal. The
  // authoritative state is completionStatus (same field tournaments.tsx/tournament/[id].tsx use),
  // with registrationPhase/status only distinguishing open vs. closed registration beneath that.
  const display = getTournamentDisplayStatus(item);
  const completed = display?.type === 'completed';
  const status = (item.registrationPhase || item.status || '').toString().toUpperCase();
  const open = !completed && (status.includes('OPEN') || status === 'PUBLISHED');
  const venue = item.venue || item.venueName || item.location || 'Venue TBC';
  const fee = registrationFeeLabel(item);
  // Replaces a generic category count with the actual event type(s) (e.g. "Singles", or
  // "Singles & Doubles" for a tournament that runs both), read from the same category rows
  // already returned by the tournaments list — no extra fetch.
  const eventTypes: string[] = Array.from(
    new Set(
      (item.categories || [])
        .map((c: any) => String(c.eventType || c.event_type || '').toUpperCase())
        .filter(Boolean) as string[],
    ),
  );
  const eventTypeLabel = eventTypes.length
    ? eventTypes.map((t) => t.charAt(0) + t.slice(1).toLowerCase()).join(' & ')
    : 'Event';
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
        <View style={styles.statusRow}>
          <View style={[styles.statusOutlinePill, open && styles.statusOutlinePillOpen]}>
            <Text style={[styles.badge, open && styles.badgeOpen]}>
              {completed ? 'COMPLETED' : open ? 'OPEN REGISTRATION' : status || 'UPCOMING'}
            </Text>
          </View>
          {open && (
            <View style={styles.statusFilledPill}>
              <Text style={styles.statusFilledPillText}>OPEN</Text>
            </View>
          )}
        </View>
        <Text style={styles.tName} numberOfLines={1}>
          {item.name || 'Tournament'}
        </Text>
        <Text style={styles.meta}>
          {venue} · {eventTypeLabel}
        </Text>
        <View style={styles.feeRow}>
          <View style={styles.locationChip}>
            <View style={styles.locationIconBox}>
              <TournamentIcon name="location" size={12} />
            </View>
            <Text style={styles.locationText} numberOfLines={1}>
              {venue}
            </Text>
          </View>
          <View style={styles.feeDivider} />
          <View style={styles.feePill}>
            <Text style={styles.feePillRupee}>₹</Text>
            <View>
              <Text style={styles.feePillLabel}>Entry fee</Text>
              <Text style={styles.feePillValue}>{fee}</Text>
            </View>
          </View>
        </View>
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
  bellButton: { marginLeft: 'auto', marginRight: 6 },
  bell: { color: colors.white, fontSize: 20 },
  bellBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: '#E5484D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: { color: colors.white, fontSize: 9, fontWeight: '900' },
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
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusOutlinePill: {
    borderWidth: 1,
    borderColor: '#3A5C50',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusOutlinePillOpen: { borderColor: colors.lime },
  badge: { color: '#A7B7B1', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  badgeOpen: { color: colors.lime },
  statusFilledPill: {
    backgroundColor: colors.lime,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusFilledPillText: { color: colors.primaryDark, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  locationChip: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  locationIconBox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#0D4939',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  locationText: { color: '#A7B7B1', fontSize: 11, flexShrink: 1 },
  feeDivider: { width: 1, height: 26, backgroundColor: '#1B4C3D' },
  feePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#06251F',
    borderWidth: 1.5,
    borderColor: colors.lime,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    shadowColor: colors.lime,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
    minWidth: 104,
  },
  feePillRupee: {
    color: colors.primaryDark,
    backgroundColor: colors.lime,
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 14,
    fontWeight: '900',
    overflow: 'hidden',
  },
  feePillLabel: { color: '#A7B7B1', fontSize: 9, fontWeight: '700', lineHeight: 11 },
  feePillValue: { color: '#D8FF4F', fontSize: 15, fontWeight: '900', lineHeight: 17 },
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
});
