import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
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

const FINISHED_STATUSES = ['COMPLETED', 'CLEANUP_PENDING'];

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
  return (
    <ScreenContainer dark>
      <View style={s.headerBand}>
        <View style={s.brandRow}>
          <Text style={s.brand}>
            Smash<Text style={s.brandAccent}>Point</Text>
          </Text>
          <Text style={s.role}>PLAYER</Text>
        </View>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl tintColor={colors.primary} refreshing={q.isFetching} onRefresh={() => q.refetch()} />}
      >
        <Text style={s.title}>Friendly Match</Text>
        <Text style={s.subtitle}>
          Play, practice, and stay connected with your badminton friends. Create or join a friendly
          match.
        </Text>

        <Pressable style={s.createButton} onPress={() => router.push('/(player)/friendly/create')}>
          <View style={s.createIcon}>
            <Text style={s.createIconText}>+</Text>
          </View>
          <Text style={s.createText}>Create Friendly Match</Text>
          <Text style={s.createChevron}>›</Text>
        </Pressable>

        {loading && (
          <View style={s.center}>
            <ActivityIndicator color={colors.primary} />
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
            {matches.map((m: any) => {
              const finished = FINISHED_STATUSES.includes(String(m.status || '').toUpperCase());
              const date = String(m.created_at || m.createdAt || '').slice(0, 10);
              return (
                <View key={m.id} style={s.card}>
                  <View style={s.cardTop}>
                    <View style={s.badges}>
                      <Text
                        style={[
                          s.badge,
                          finished ? s.badgeCompleted : s.badgeOpen,
                        ]}
                      >
                        {finished ? 'COMPLETED' : (m.status || 'OPEN').toUpperCase()}
                      </Text>
                      <Text style={[s.badge, s.badgeEvent]}>{m.event_type}</Text>
                    </View>
                    {!!date && <Text style={s.date}>{date}</Text>}
                  </View>
                  <Text style={s.name}>{m.title}</Text>
                  <Text style={s.meta}>
                    {m.participant_count ?? 0}/{m.max_players} players · {m.format}
                  </Text>
                  {finished && <MatchResult match={m} />}
                  <PrimaryButton
                    title="View Details"
                    onPress={() => router.push({ pathname: '/(player)/friendly/[id]', params: { id: String(m.id) } })}
                  />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      <BottomNav active="Friendly" />
    </ScreenContainer>
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

const s = StyleSheet.create({
  headerBand: { backgroundColor: '#04241D', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  scroll: { backgroundColor: '#FCFDFC' },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 100 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm },
  brand: { color: colors.white, fontSize: 20, fontWeight: '900' },
  brandAccent: { color: colors.lime },
  role: { flex: 1, color: colors.lime, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  createIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createIconText: { color: colors.primary, fontSize: 18, fontWeight: '900', lineHeight: 20 },
  createText: { flex: 1, color: colors.white, fontSize: 15, fontWeight: '900' },
  createChevron: { color: colors.white, fontSize: 20, fontWeight: '900' },
  center: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxl },
  muted: { color: colors.muted },
  errorTitle: { color: colors.error, fontSize: 15, fontWeight: '800' },
  retry: { color: colors.primary, fontWeight: '900' },
  list: { marginTop: spacing.lg, gap: spacing.md },
  card: { backgroundColor: '#EFF6F1', padding: 16, borderRadius: radius.lg, gap: spacing.sm },
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
  badgeCompleted: { backgroundColor: '#DCF4E8', color: colors.success },
  badgeOpen: { backgroundColor: '#E8F8C9', color: colors.primaryDark },
  badgeEvent: { backgroundColor: '#E3EEF8', color: colors.info },
  date: { color: colors.muted, fontSize: 12, paddingTop: 5 },
  name: { fontWeight: '900', fontSize: 17, color: '#12211B' },
  meta: { color: '#5C776C' },
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
