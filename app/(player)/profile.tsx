import { Alert, Image, Pressable, Text, StyleSheet, View, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { useAuthStore } from '../../src/store/authStore';
import { usePlayers } from '../../src/features/player/api';
import { resolvePlayerProfile } from '../../src/features/player/profile';
import { QueryState } from '../../src/components/feedback/QueryState';
import { colors, radius, spacing } from '../../src/theme';
import { TournamentIcon } from '../../src/components/common/TournamentIcon';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { BottomNav } from '../../src/components/common/BottomNav';
import { playerInitial } from '../../src/features/player/initials';
import { useQueryClient } from '@tanstack/react-query';
import { performLogout } from '../../src/features/auth/logout';

export default function Profile() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const query = usePlayers();
  const profile = resolvePlayerProfile(query.data ?? [], user);
  useEffect(() => {
    if (!profile || !user) return;
    // Guard against re-triggering: setState below creates a new `user` object every time, and
    // `user` is a dependency of this effect, so without this check it would set state -> re-render
    // -> new user reference -> effect fires again -> infinite loop (froze the app once a profile
    // actually existed, since this previously never ran past the `!profile` early return).
    if (
      user.playerProfile?.id === profile.id &&
      user.playerProfile?.playerCode === profile.playerCode
    )
      return;
    useAuthStore.setState({
      user: { ...user, playerProfile: { id: profile.id, playerCode: profile.playerCode } },
    });
  }, [profile, user]);
  const confirmLogout = () =>
    Alert.alert('Logout?', 'Are you sure you want to sign out from this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => void performLogout(queryClient) },
    ]);
  return (
    <ScreenContainer dark>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.heroDecor} pointerEvents="none">
          <View style={s.heroGlow} />
          <View style={s.heroShuttleMask}>
            <Image
              source={require('../../assets/images/login-badminton-bg.png')}
              style={s.heroShuttleImage}
              resizeMode="cover"
            />
            <View style={s.heroShuttleFade} />
          </View>
          <Text style={s.heroScript}>Play{'\n'}Better{'\n'}Everyday</Text>
        </View>
        <View style={s.header}>
          <View style={s.brand}>
            <Text style={s.brandName}>
              Smash<Text style={s.brandAccent}>Point</Text>
            </Text>
            <Text style={s.tagline}>PLAY · COMPETE · CONNECT</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile actions"
            onPress={() =>
              Alert.alert('Profile actions', undefined, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Edit Profile', onPress: () => router.push('/(player)/profile-edit') },
                { text: 'Logout', style: 'destructive', onPress: confirmLogout },
              ])
            }
            style={s.circle}
          >
            <Text style={s.dots}>⋮</Text>
          </Pressable>
        </View>

        <Text style={s.kicker}>PLAYER PROFILE</Text>
        <Text style={s.title}>My profile</Text>
        <Text style={s.subtitle}>Your badminton journey, all in one place.</Text>

        <QueryState loading={query.isLoading} error={query.isError} onRetry={() => query.refetch()} />

        {!query.isLoading && !query.isError && !profile && (
          <>
            <Text style={s.empty}>You haven't created a player profile yet.</Text>
            <PrimaryButton
              title="Create profile"
              onPress={() => router.push('/(player)/profile-edit')}
            />
          </>
        )}

        {profile && (
          <>
            <View style={s.card}>
              <View style={s.cardSheen} pointerEvents="none" />
              <View style={s.cardGlow} pointerEvents="none" />
              <View style={s.cardTop}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>
                    {playerInitial(profile.fullName || user?.name || user?.fullName)}
                  </Text>
                </View>
                <View style={s.cardCopy}>
                  <Text style={s.name}>{profile.fullName}</Text>
                  <Text style={s.code}>{profile.playerCode}</Text>
                  <View style={s.locationRow}>
                    <TournamentIcon name="location" size={13} />
                    <Text style={s.location}>{profile.location || 'Location not provided'}</Text>
                  </View>
                </View>
                <View style={s.playerBadge}>
                  <TournamentIcon name="shuttle" size={20} />
                  <Text style={s.playerBadgeText}>BADMINTON{'\n'}PLAYER</Text>
                </View>
              </View>
              <View style={s.cardDivider} />
              <View style={s.cardBottom}>
                <Text style={s.quote}>"Play. Improve. Stay Connected."</Text>
                <Text style={s.wordmark}>SMASHPOINT</Text>
              </View>
            </View>

            <View style={s.sectionHeader}>
              <View style={s.sectionTitleRow}>
                <TournamentIcon name="people" size={17} />
                <Text style={s.section}>Player details</Text>
              </View>
              <Text style={s.sectionHint}>Keep your profile up to date</Text>
            </View>
            <View style={s.grid}>
              <DetailRow glyph={genderGlyph(profile.gender)} label="Gender" value={profile.gender} />
              <DetailRow icon="calendar" label="Playing since" value={profile.playingSince} />
              <DetailRow icon="map" label="Court / academy" value={profile.courtAcademy} />
              <DetailRow icon="location" label="Location" value={profile.location} />
            </View>

            <Pressable style={s.editButton} onPress={() => router.push('/(player)/profile-edit')}>
              <Text style={s.editIcon}>✎</Text>
              <Text style={s.editText}>Edit profile</Text>
              <Text style={s.editChevron}>›</Text>
            </Pressable>

            <View style={s.linkRow}>
              <Pressable style={s.linkItem} onPress={() => router.push('/(player)/medals')}>
                <TournamentIcon name="medal" size={18} />
                <Text style={s.linkText}>Medal History</Text>
                <Text style={s.linkChevron}>›</Text>
              </Pressable>
              <Pressable style={s.linkItem} onPress={() => router.push('/(player)/results')}>
                <TournamentIcon name="bars" size={18} />
                <Text style={s.linkText}>My Results</Text>
                <Text style={s.linkChevron}>›</Text>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Logout"
              style={s.logout}
              onPress={confirmLogout}
            >
              <Text style={s.logoutIcon}>↪</Text>
              <View style={s.logoutCopy}>
                <Text style={s.logoutTitle}>Logout</Text>
                <Text style={s.logoutSubtitle}>Sign out from this device</Text>
              </View>
              <Text style={s.logoutChevron}>›</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
      <BottomNav active="Profile" />
    </ScreenContainer>
  );
}

function genderGlyph(gender?: string | null) {
  const g = String(gender || '').toUpperCase();
  return g === 'FEMALE' ? '♀' : g === 'MALE' ? '♂' : '⚲';
}

function DetailRow({
  icon,
  glyph,
  label,
  value,
}: {
  icon?: any;
  glyph?: string;
  label: string;
  value?: string | number | null;
}) {
  return (
    <View style={s.item}>
      <View style={s.itemIcon}>
        {glyph ? <Text style={s.itemGlyph}>{glyph}</Text> : <TournamentIcon name={icon} size={17} />}
      </View>
      <View style={s.itemCopy}>
        <Text style={s.itemLabel}>{label}</Text>
        <Text style={s.itemValue}>{value || 'Not provided'}</Text>
      </View>
    </View>
  );
}

const DARK_CARD = '#0C2E27';
const DARK_CARD_BORDER = '#164A3C';
const s = StyleSheet.create({
  content: { paddingBottom: 100 },
  heroDecor: { position: 'absolute', top: 0, right: 0, width: 260, height: 300, alignItems: 'flex-end' },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.sport,
    opacity: 0.16,
  },
  heroGlowSoft: { display: 'none' },
  heroShuttleMask: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 210,
    height: 260,
    borderBottomLeftRadius: 140,
    overflow: 'hidden',
  },
  heroShuttleImage: { width: '100%', height: '100%', opacity: 0.4 },
  heroShuttleFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#021B17',
    opacity: 0.35,
  },
  heroScript: {
    position: 'absolute',
    top: 60,
    right: 18,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontStyle: 'italic',
    fontWeight: '700',
    textAlign: 'right',
    lineHeight: 17,
  },
  header: { minHeight: 74, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circle: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  back: { fontSize: 32, color: colors.white, lineHeight: 34 },
  dots: { fontSize: 25, color: colors.white },
  brand: { alignItems: 'center' },
  brandName: { color: colors.white, fontSize: 20, fontWeight: '900' },
  brandAccent: { color: colors.lime },
  tagline: { color: colors.lime, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  kicker: { color: colors.lime, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginTop: spacing.md },
  title: { color: colors.white, fontSize: 28, fontWeight: '900', marginTop: 4 },
  subtitle: { color: '#9FC2B3', fontSize: 13, marginTop: 4, marginBottom: spacing.lg, maxWidth: 230 },
  empty: { color: '#9FC2B3', fontSize: 15, marginTop: 24, marginBottom: 16 },
  card: {
    backgroundColor: 'rgba(18, 54, 45, 0.5)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(138, 226, 52, 0.4)',
    padding: spacing.lg,
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.lime,
    opacity: 0.08,
    top: -70,
    left: -50,
  },
  cardSheen: {
    position: 'absolute',
    top: -60,
    left: -40,
    width: '160%',
    height: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    transform: [{ rotate: '-8deg' }],
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primaryDark, fontSize: 26, fontWeight: '900' },
  cardCopy: { flex: 1, minWidth: 0 },
  name: { fontSize: 20, fontWeight: '900', color: colors.white },
  code: { color: colors.lime, fontWeight: '800', marginTop: 3, fontSize: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  location: { color: '#C8DED1', fontSize: 12 },
  playerBadge: {
    backgroundColor: 'rgba(138, 226, 52, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(138, 226, 52, 0.4)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    gap: 5,
  },
  playerBadgeText: { color: colors.lime, fontSize: 9, fontWeight: '900', textAlign: 'center', lineHeight: 12 },
  cardDivider: { height: 1, backgroundColor: DARK_CARD_BORDER, marginVertical: spacing.md },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quote: { color: '#9FC2B3', fontSize: 12, fontStyle: 'italic', flex: 1 },
  wordmark: { color: '#4C6D61', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  sectionHeader: { marginTop: spacing.xl, marginBottom: spacing.md, gap: 2 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  section: { fontSize: 19, fontWeight: '900', color: colors.white },
  sectionHint: { color: '#9FC2B3', fontSize: 11, marginLeft: 25 },
  grid: { gap: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: DARK_CARD,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: DARK_CARD_BORDER,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(138, 226, 52, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemGlyph: { color: colors.lime, fontSize: 18, fontWeight: '900', lineHeight: 20 },
  itemCopy: { flex: 1, minWidth: 0 },
  itemLabel: { color: '#9FC2B3', fontSize: 12, fontWeight: '700' },
  itemValue: { color: colors.white, fontSize: 16, fontWeight: '800', marginTop: 3 },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.lime,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  editIcon: { fontSize: 16, color: colors.primaryDark },
  editText: { flex: 1, color: colors.primaryDark, fontSize: 15, fontWeight: '900' },
  editChevron: { color: colors.primaryDark, fontSize: 20, fontWeight: '900' },
  linkRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  linkItem: {
    flex: 1,
    backgroundColor: DARK_CARD,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: DARK_CARD_BORDER,
    padding: spacing.md,
    gap: 4,
  },
  linkText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  linkChevron: { color: colors.lime, fontSize: 18, fontWeight: '900' },
  logout: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1414',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#5A2A2A',
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  logoutIcon: { color: '#FF8D8D', fontSize: 22, width: 30, textAlign: 'center' },
  logoutCopy: { flex: 1, marginLeft: 4 },
  logoutTitle: { color: '#FF8D8D', fontSize: 15, fontWeight: '900' },
  logoutSubtitle: { color: '#B08282', fontSize: 11, marginTop: 2 },
  logoutChevron: { color: '#FF8D8D', fontSize: 20, fontWeight: '900' },
});
