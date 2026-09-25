import { ActivityIndicator, Dimensions, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { BottomNav } from '../../src/components/common/BottomNav';
import { TournamentIcon, type TournamentIconName } from '../../src/components/common/TournamentIcon';
import {
  useFriendlyList,
  useFriendlyParticipants,
  friendlyApi,
  friendlyKeys,
  friendlyLifecycleApi,
  resolveFriendlySide,
} from '../../src/features/player/friendly';
import { colors, radius, spacing } from '../../src/theme';

const heroBg = require('../../assets/images/friendly-hero-bg-crop.png');
const shuttleIcon = require('../../assets/images/shuttle-icon.png');
const FINISHED_STATUSES = ['COMPLETED', 'CLEANUP_PENDING'];
const FEATURES: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'people-outline', label: 'Play Together' },
  { icon: 'stats-chart-outline', label: 'Improve Skills' },
  { icon: 'heart-outline', label: 'Build Network' },
  { icon: 'trophy-outline', label: 'Have Fun' },
];
type FilterTab = 'ALL' | 'OPEN' | 'ACTIVE' | 'COMPLETED';
const matchFilterStatus = (m: any): FilterTab => {
  const status = String(m.status || '').toUpperCase();
  if (FINISHED_STATUSES.includes(status)) return 'COMPLETED';
  if (status === 'ACTIVE') return 'ACTIVE';
  return 'OPEN';
};
type CardTone = 'open' | 'active' | 'completed';
const badgeToneStyle = (tone: CardTone) =>
  tone === 'completed' ? s.badgeCompleted : tone === 'active' ? s.badgeActive : s.badgeOpen;
const cardIconToneStyle = (tone: CardTone) =>
  tone === 'completed' ? s.cardIconCompleted : tone === 'active' ? s.cardIconActive : s.cardIconOpen;

function MatchResult({ match }: { match: any }) {
  const isLeague = match.format === 'LEAGUE';
  const participants = useFriendlyParticipants(match.id);
  const teams = useQuery({
    queryKey: friendlyKeys.teams(match.id),
    queryFn: () => friendlyApi.teams(match.id),
  });
  const result = useQuery({
    queryKey: friendlyKeys.result(match.id),
    queryFn: () => friendlyLifecycleApi.result(match.id),
    enabled: !isLeague,
  });
  const standings = useQuery({
    queryKey: friendlyKeys.standings(match.id),
    queryFn: () => friendlyLifecycleApi.standings(match.id),
    enabled: isLeague,
  });
  const p = participants.data || [];
  const t = teams.data || [];

  let winner: string | null = null;
  let runnerUp: string | null = null;
  if (isLeague) {
    const ranked = [...(standings.data?.standings || [])].sort((a: any, b: any) => b.won - a.won);
    if (ranked[0]) winner = resolveFriendlySide({ id: ranked[0].participantId, type: ranked[0].participantType }, p, t);
    if (ranked[1]) runnerUp = resolveFriendlySide({ id: ranked[1].participantId, type: ranked[1].participantType }, p, t);
  } else if (result.data?.winner) {
    winner = resolveFriendlySide(
      { id: result.data.winner.participantId, type: result.data.winner.participantType },
      p,
      t,
    );
    if (result.data.runnerUp)
      runnerUp = resolveFriendlySide(
        { id: result.data.runnerUp.participantId, type: result.data.runnerUp.participantType },
        p,
        t,
      );
  }

  if (!winner) return null;
  return (
    <View style={s.resultSection}>
      <View style={s.resultHeader}>
        <Text style={s.resultTitle}>🏆 Match Result</Text>
        <Text style={s.resultSubtitle}>Congratulations to all the players!</Text>
      </View>
      <ResultRow rank={1} tone="gold" place="WINNER" name={winner} />
      {runnerUp && <ResultRow rank={2} tone="silver" place="RUNNER-UP" name={runnerUp} />}
    </View>
  );
}

function ResultRow({
  rank,
  tone,
  place,
  name,
}: {
  rank: 1 | 2;
  tone: 'gold' | 'silver';
  place: 'WINNER' | 'RUNNER-UP';
  name: string;
}) {
  const names = String(name || '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
  return (
    <View style={[s.resultRow, tone === 'gold' ? s.resultRowGold : s.resultRowSilver]}>
      <View style={[s.resultMedal, tone === 'gold' ? s.resultMedalGold : s.resultMedalSilver]}>
        <Text style={[s.resultMedalIcon, tone === 'gold' ? s.resultPlaceGold : s.resultPlaceSilver]}>
          {rank}
        </Text>
      </View>
      <View style={s.resultCopy}>
        <Text style={[s.resultPlace, tone === 'gold' ? s.resultPlaceGold : s.resultPlaceSilver]}>
          {place}
        </Text>
        <Text style={s.resultName} numberOfLines={2}>
          {names.length ? names.join(' • ') : name}
        </Text>
      </View>
      <Text style={[s.resultChevron, tone === 'gold' ? s.resultPlaceGold : s.resultPlaceSilver]}>
        ›
      </Text>
    </View>
  );
}

export default function Friendly() {
  const q = useFriendlyList();
  const matches = (q.data || []) as any[];
  const loading = q.isLoading;
  // A successful response with zero matches is NOT an error — q.isError only reflects a genuine
  // request failure, so this branching already keeps "no matches yet" and "request failed" distinct.
  const failed = q.isError;
  const empty = !loading && !failed && matches.length === 0;
  const [tab, setTab] = useState<FilterTab>('ALL');
  const counts = {
    ALL: matches.length,
    OPEN: matches.filter((m) => matchFilterStatus(m) === 'OPEN').length,
    ACTIVE: matches.filter((m) => matchFilterStatus(m) === 'ACTIVE').length,
    COMPLETED: matches.filter((m) => matchFilterStatus(m) === 'COMPLETED').length,
  };
  const visible = tab === 'ALL' ? matches : matches.filter((m) => matchFilterStatus(m) === tab);
  return (
    <ScreenContainer dark>
      <View style={s.bgWrap}>
        <Image source={heroBg} style={s.bgImage} resizeMode="cover" />
        <View style={s.bgOverlay} pointerEvents="none" />
        <View style={s.bgOverlayLeftA} pointerEvents="none" />
        <View style={s.bgOverlayLeftB} pointerEvents="none" />
        <View style={s.bgOverlayLeftC} pointerEvents="none" />
        <View style={s.bgFade} pointerEvents="none" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={s.scroll}
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl tintColor={colors.lime} refreshing={q.isFetching} onRefresh={() => q.refetch()} />}
        >
          <View style={s.hero}>
            <View style={s.headerRow}>
            <View>
              <Text style={s.brand}>
                Smash<Text style={s.brandAccent}>Point</Text>
              </Text>
              <Text style={s.role}>PLAYER</Text>
            </View>
            <View style={s.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                style={s.iconCircle}
                onPress={() => router.push('/(player)/notifications')}
              >
                <Ionicons name="notifications-outline" size={20} color={colors.white} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Players directory"
                style={s.iconCircle}
                onPress={() => router.push('/(player)/players')}
              >
                <Ionicons name="people-outline" size={20} color={colors.white} />
              </Pressable>
            </View>
          </View>

          <Text style={s.title}>
            Friendly{'\n'}
            <Text style={s.titleAccent}>Match</Text>
          </Text>
          <Text style={s.subtitle}>
            Play, practice, and stay connected with your badminton friends. Create or join a friendly
            match.
          </Text>

          <View style={s.featureRow}>
            {FEATURES.map((f) => (
              <View key={f.label} style={s.feature}>
                <View style={s.featureIcon}>
                  <Ionicons name={f.icon} size={22} color={colors.white} />
                </View>
                <Text style={s.featureLabel}>{f.label}</Text>
              </View>
            ))}
          </View>

          <Pressable style={s.createButton} onPress={() => router.push('/(player)/friendly/create')}>
            <View style={s.createSheen} pointerEvents="none" />
            <View style={s.createIcon}>
              <Text style={s.createIconText}>+</Text>
            </View>
            <View style={s.createCopy}>
              <Text style={s.createText}>Create Friendly Match</Text>
              <Text style={s.createSubtext}>Set up a new match and invite players</Text>
            </View>
            <View style={s.createChevronCircle}>
              <Text style={s.createChevron}>›</Text>
            </View>
          </Pressable>
        </View>

        <View style={s.body}>
          <View style={s.tabRow}>
            <FilterTabButton label="All Matches" count={counts.ALL} active={tab === 'ALL'} onPress={() => setTab('ALL')} />
            <FilterTabButton label="Open" count={counts.OPEN} dotColor={colors.lime} active={tab === 'OPEN'} onPress={() => setTab('OPEN')} />
            <FilterTabButton label="Active" count={counts.ACTIVE} dotColor={colors.info} active={tab === 'ACTIVE'} onPress={() => setTab('ACTIVE')} />
            <FilterTabButton label="Completed" count={counts.COMPLETED} dotColor={colors.warning} active={tab === 'COMPLETED'} onPress={() => setTab('COMPLETED')} />
          </View>

          {loading && (
            <View style={s.center}>
              <ActivityIndicator color={colors.lime} />
              <Text style={s.muted}>Loading friendly matches…</Text>
            </View>
          )}

          {failed && (
            <View style={s.center}>
              <Text style={s.errorTitle}>Unable to load matches.</Text>
              <Text onPress={() => q.refetch()} style={s.retry}>
                Tap to retry
              </Text>
            </View>
          )}

          {empty && <EmptyState />}

          {!loading && !failed && matches.length > 0 && (
            <View style={s.list}>
              {visible.map((m: any) => {
                const filterStatus = matchFilterStatus(m);
                const finished = filterStatus === 'COMPLETED';
                const date = String(m.created_at || m.createdAt || '').slice(0, 10);
                const tone =
                  filterStatus === 'COMPLETED' ? 'completed' : filterStatus === 'ACTIVE' ? 'active' : 'open';
                return (
                  <Pressable
                    key={m.id}
                    style={s.card}
                    onPress={() => router.push({ pathname: '/(player)/friendly/[id]', params: { id: String(m.id) } })}
                  >
                    <View style={s.cardTop}>
                      <View style={s.badges}>
                        <Text style={[s.badge, badgeToneStyle(tone)]}>
                          {finished ? 'COMPLETED' : (m.status || 'OPEN').toUpperCase()}
                        </Text>
                        <Text style={[s.badge, s.badgeEvent]}>{m.event_type}</Text>
                      </View>
                      {!!date && (
                        <View style={s.dateRow}>
                          <Ionicons name="calendar-outline" size={13} color="#9FC2B3" />
                          <Text style={s.date}>{date}</Text>
                        </View>
                      )}
                    </View>
                    <View style={s.cardMain}>
                      <View style={[s.cardIcon, cardIconToneStyle(tone)]}>
                        <Image source={shuttleIcon} style={s.cardIconImage} resizeMode="contain" />
                      </View>
                      <View style={s.cardCopy}>
                        <Text style={s.name}>{m.title}</Text>
                        <View style={s.metaRow}>
                          <Ionicons name="people-outline" size={13} color="#9FC2B3" />
                          <Text style={s.meta}>
                            {m.participant_count ?? 0}/{m.max_players} players
                          </Text>
                          <Text style={s.metaDot}>·</Text>
                          <Ionicons name="git-branch-outline" size={13} color="#9FC2B3" />
                          <Text style={s.meta}>{m.format}</Text>
                        </View>
                      </View>
                      <Text style={s.cardChevron}>›</Text>
                    </View>
                    {finished && <MatchResult match={m} />}
                    <Pressable
                      style={s.viewDetailsButton}
                      onPress={() => router.push({ pathname: '/(player)/friendly/[id]', params: { id: String(m.id) } })}
                    >
                      <Text style={s.viewDetailsText}>View Details</Text>
                      <Text style={s.viewDetailsChevron}>›</Text>
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
        </ScrollView>
      </View>
      <BottomNav active="Friendly" />
    </ScreenContainer>
  );
}

function FilterTabButton({
  label,
  count,
  active,
  dotColor,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  dotColor?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[s.tab, active && s.tabActive]}>
      {dotColor ? <View style={[s.tabDot, { backgroundColor: dotColor }]} /> : null}
      <Text style={[s.tabText, active && s.tabTextActive]}>
        {label} ({count})
      </Text>
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View style={s.emptySection}>
      <EmptyIllustration />
      <Text style={s.emptyTitle}>No Friendly Matches Yet!</Text>
      <Text style={s.emptyText}>
        You haven't created or joined any friendly matches. Be the first to create one and get your
        friends on court!
      </Text>

      <View style={s.benefitsCard}>
        <Text style={s.benefitsHeading}>Why create a Friendly Match?</Text>
        <View style={s.benefitsGrid}>
          <Benefit icon="people" text={'Play with\nyour friends'} />
          <View style={s.benefitDivider} />
          <Benefit icon="calendar" text={'Choose\nformat & rules'} />
          <View style={s.benefitDivider} />
          <Benefit icon="trophy" text={'Track\nscores & results'} />
          <View style={s.benefitDivider} />
          <Benefit icon="people" text={'Fun practice\nanytime'} />
        </View>
      </View>

      <View style={s.quoteCard}>
        <TournamentIcon name="quote" size={18} />
        <Text style={s.quoteText}>"Good players practice. Great players play together."</Text>
        <Text style={s.quoteAuthor}>— SmashPoint</Text>
      </View>
    </View>
  );
}

function Benefit({ icon, text }: { icon: TournamentIconName; text: string }) {
  return (
    <View style={s.benefit}>
      <View style={s.benefitIcon}>
        <TournamentIcon name={icon} size={18} />
      </View>
      <Text style={s.benefitText}>{text}</Text>
    </View>
  );
}

function EmptyIllustration() {
  return (
    <View style={s.illustrationWrap}>
      <View style={s.illustrationBlob} />
      <View style={[s.illustrationDot, s.illustrationDotLeft]} />
      <View style={[s.illustrationDot, s.illustrationDotRight]} />
      <Racket side="left" />
      <Racket side="right" />
      <View style={s.shuttleDecorLeft} />
      <View style={s.shuttleDecorRight} />
      <View style={s.shuttleSkirt} />
      <View style={s.shuttleCork} />
    </View>
  );
}

function Racket({ side }: { side: 'left' | 'right' }) {
  return (
    <View style={[s.racket, side === 'left' ? s.racketLeft : s.racketRight]}>
      <View style={s.racketHead}>
        <View style={[s.racketString, s.racketStringOne]} />
        <View style={[s.racketString, s.racketStringTwo]} />
        <View style={[s.racketString, s.racketStringThree]} />
        <View style={[s.racketString, s.racketStringFour]} />
      </View>
      <View style={s.racketHandle} />
    </View>
  );
}

const DARK_CARD = 'rgba(12, 46, 39, 0.55)';
const DARK_CARD_BORDER = 'rgba(138, 226, 52, 0.28)';
// friendly-hero-bg-crop.png (850x1080) is pre-cropped from the full source image to the top region
// containing the player/racket/shuttle, so a plain centered `cover` reliably keeps that composition
// in frame — the full 850x1851 source's player content sits too far down for `cover`'s centered
// crop to reach when using the full tall image directly against a much shorter/wider container.
const BG_HEIGHT = 1150;
// Computed (not `aspectRatio`, which doesn't resolve reliably on an absolutely-positioned Image
// here) so `cover` never has to zoom in and crop the racket/shuttle off the right edge — the
// 850x1080 crop is proportionally wider than BG_HEIGHT, so a fixed image height forces a
// horizontal crop; sizing the image to the source's true aspect at full width avoids that, and
// the solid bgWrap background below it seamlessly extends the dark hero backdrop to BG_HEIGHT.
const HERO_IMG_WIDTH = Dimensions.get('window').width - spacing.md * 2;
const HERO_IMG_HEIGHT = HERO_IMG_WIDTH * (1080 / 850);
const s = StyleSheet.create({
  bgWrap: { flex: 1, position: 'relative', backgroundColor: '#021B17' },
  bgImage: { position: 'absolute', top: 0, left: 0, width: HERO_IMG_WIDTH, height: HERO_IMG_HEIGHT },
  bgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: BG_HEIGHT,
    backgroundColor: 'rgba(2, 20, 16, 0.2)',
  },
  // Poor-man's left-to-right gradient (no gradient lib in this project): stacked bands, darkest at
  // the left edge behind the title/text, fading to nothing by ~60% width so the player stays clear.
  bgOverlayLeftA: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '32%',
    height: BG_HEIGHT,
    backgroundColor: 'rgba(2, 20, 16, 0.42)',
  },
  bgOverlayLeftB: {
    position: 'absolute',
    top: 0,
    left: '28%',
    width: '20%',
    height: BG_HEIGHT,
    backgroundColor: 'rgba(2, 20, 16, 0.22)',
  },
  bgOverlayLeftC: {
    position: 'absolute',
    top: 0,
    left: '46%',
    width: '16%',
    height: BG_HEIGHT,
    backgroundColor: 'rgba(2, 20, 16, 0.1)',
  },
  // Fades the image into the solid #021B17 background so cards further down the (variable-length)
  // list sit on a flat color instead of a hard image cutoff — same dark-green family, so it reads
  // as one continuous background rather than a visible seam.
  bgFade: {
    position: 'absolute',
    top: BG_HEIGHT - 320,
    left: 0,
    right: 0,
    height: 320,
    backgroundColor: '#021B17',
    opacity: 0.94,
  },
  scroll: { backgroundColor: 'transparent' },
  content: { paddingBottom: 100 },
  hero: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { color: colors.white, fontSize: 20, fontWeight: '900' },
  brandAccent: { color: colors.lime },
  role: { color: colors.lime, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  title: { color: colors.white, fontSize: 36, fontWeight: '900', lineHeight: 40, marginTop: spacing.lg },
  titleAccent: { color: colors.lime },
  subtitle: { color: '#D7E7E0', fontSize: 13, lineHeight: 19, marginTop: spacing.sm, maxWidth: 300 },
  featureRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl },
  feature: { alignItems: 'center', gap: 6, width: '24%' },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: { color: colors.white, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(30, 140, 90, 0.4)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(138, 226, 52, 0.5)',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xl,
    overflow: 'hidden',
    shadowColor: colors.lime,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  createSheen: {
    position: 'absolute',
    top: -40,
    left: -30,
    width: '160%',
    height: 90,
    backgroundColor: 'rgba(255,255,255,0.12)',
    transform: [{ rotate: '-8deg' }],
  },
  createIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createIconText: { color: colors.primaryDark, fontSize: 18, fontWeight: '900', lineHeight: 20 },
  createCopy: { flex: 1 },
  createText: { color: colors.white, fontSize: 15, fontWeight: '900' },
  createSubtext: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  createChevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createChevron: { color: colors.white, fontSize: 18, fontWeight: '900' },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: DARK_CARD_BORDER,
    backgroundColor: DARK_CARD,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  tabActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  tabDot: { width: 7, height: 7, borderRadius: 4 },
  tabText: { color: '#9FC2B3', fontSize: 12, fontWeight: '800' },
  tabTextActive: { color: colors.primaryDark },
  center: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxl },
  muted: { color: colors.muted },
  errorTitle: { color: colors.error, fontSize: 15, fontWeight: '800' },
  retry: { color: colors.lime, fontWeight: '900' },
  list: { marginTop: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: DARK_CARD,
    borderWidth: 1,
    borderColor: DARK_CARD_BORDER,
    padding: 16,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1, paddingRight: spacing.sm },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    overflow: 'hidden',
  },
  badgeCompleted: { backgroundColor: colors.warning, color: colors.white },
  badgeOpen: { backgroundColor: '#2F8F52', color: colors.white },
  badgeActive: { backgroundColor: '#1F4D82', color: colors.white },
  badgeEvent: { backgroundColor: '#2F5FA8', color: colors.white },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 5 },
  date: { color: '#9FC2B3', fontSize: 12 },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardIconImage: { width: 40, height: 40 },
  cardIconOpen: { backgroundColor: 'rgba(138, 226, 52, 0.12)', borderColor: 'rgba(138, 226, 52, 0.4)' },
  cardIconActive: { backgroundColor: 'rgba(59, 130, 196, 0.15)', borderColor: 'rgba(59, 130, 196, 0.45)' },
  cardIconCompleted: { backgroundColor: 'rgba(242, 163, 58, 0.15)', borderColor: 'rgba(242, 163, 58, 0.45)' },
  cardCopy: { flex: 1, minWidth: 0 },
  cardChevron: { color: colors.lime, fontSize: 24, fontWeight: '900' },
  name: { fontWeight: '900', fontSize: 17, color: colors.white },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  meta: { color: '#9FC2B3', fontSize: 13 },
  metaDot: { color: '#9FC2B3', fontSize: 13 },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  viewDetailsText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  viewDetailsChevron: { color: colors.white, fontSize: 18, fontWeight: '900' },
  resultSection: {
    backgroundColor: '#E4F3EA',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  resultHeader: { marginBottom: 2 },
  resultTitle: { color: colors.primaryDark, fontSize: 14, fontWeight: '900' },
  resultSubtitle: { color: colors.secondary, fontSize: 11, marginTop: 2 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  resultRowGold: { backgroundColor: '#FEF3D7', borderWidth: 1, borderColor: '#F3D98B' },
  resultRowSilver: { backgroundColor: '#EEF1F1', borderWidth: 1, borderColor: '#D8DEDD' },
  resultMedal: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  resultMedalGold: { backgroundColor: '#F6D677' },
  resultMedalSilver: { backgroundColor: '#D3D9D8' },
  resultMedalIcon: { fontSize: 16, fontWeight: '900' },
  resultCopy: { flex: 1, minWidth: 0 },
  resultPlace: { fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  resultPlaceGold: { color: '#A8760A' },
  resultPlaceSilver: { color: '#5E6B69' },
  resultName: { color: '#12211B', fontSize: 13, fontWeight: '800', marginTop: 2, flexWrap: 'wrap' },
  resultChevron: { fontSize: 20, fontWeight: '900', flexShrink: 0 },
  emptySection: { marginTop: spacing.xl, alignItems: 'center' },
  illustrationWrap: { width: '100%', maxWidth: 330, height: 210, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  illustrationBlob: { position: 'absolute', width: '82%', height: 150, bottom: 10, borderRadius: 90, backgroundColor: '#E9F8F0', transform: [{ scaleX: 1.15 }] },
  illustrationDot: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: '#DDF4E8' },
  illustrationDotLeft: { left: '18%', bottom: 54 },
  illustrationDotRight: { right: '16%', bottom: 48 },
  racket: { position: 'absolute', width: 80, height: 168, alignItems: 'center', top: 18 },
  racketLeft: { left: '22%', transform: [{ rotate: '-37deg' }] },
  racketRight: { right: '22%', transform: [{ rotate: '37deg' }] },
  racketHead: { width: 68, height: 92, borderRadius: 40, borderWidth: 5, borderColor: colors.primary, backgroundColor: 'rgba(255,255,255,0.5)', overflow: 'hidden' },
  racketString: { position: 'absolute', width: 2, height: 88, backgroundColor: '#B9DCCB', top: 0 },
  racketStringOne: { left: 15, transform: [{ rotate: '-25deg' }] },
  racketStringTwo: { left: 31 },
  racketStringThree: { right: 15, transform: [{ rotate: '25deg' }] },
  racketStringFour: { width: 58, height: 2, left: 3, top: 42 },
  racketHandle: { width: 10, height: 72, backgroundColor: colors.primaryDark, borderRadius: 5, marginTop: -3 },
  shuttleDecorLeft: { position: 'absolute', width: 18, height: 3, backgroundColor: colors.primaryDark, top: 26, left: '37%', transform: [{ rotate: '50deg' }], borderRadius: 2 },
  shuttleDecorRight: { position: 'absolute', width: 18, height: 3, backgroundColor: colors.primaryDark, top: 26, right: '37%', transform: [{ rotate: '-50deg' }], borderRadius: 2 },
  shuttleSkirt: {
    position: 'absolute',
    top: 35,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 20,
    borderRightWidth: 20,
    borderTopWidth: 34,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.surface,
  },
  shuttleCork: { position: 'absolute', top: 66, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primaryDark },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 320,
  },
  benefitsCard: {
    width: '100%',
    backgroundColor: '#ECFAF2',
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  benefitsHeading: { color: '#12211B', fontSize: 15, fontWeight: '900', marginBottom: spacing.md },
  benefitsGrid: { flexDirection: 'row', alignItems: 'stretch' },
  benefit: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: spacing.sm },
  benefitDivider: { width: 1, backgroundColor: '#C9E4D5', marginVertical: spacing.sm },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 122, 79, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: { color: '#3A4F47', fontSize: 10, fontWeight: '700', textAlign: 'center', lineHeight: 13 },
  quoteCard: {
    width: '100%',
    backgroundColor: 'rgba(138, 226, 52, 0.08)',
    borderColor: 'rgba(138, 226, 52, 0.3)',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.lg,
  },
  quoteText: { color: colors.text, fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
  quoteAuthor: { color: colors.primary, fontSize: 11, fontWeight: '900' },
});
