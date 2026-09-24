import { ImageBackground, Linking, ScrollView, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { useTournament, useRegistrations, usePlayers } from '../../../src/features/player/api';
import { useAuthStore } from '../../../src/store/authStore';
import { isPlayerRegisteredForCategory } from '../../../src/features/player/registration';
import { colors, spacing } from '../../../src/theme';
import { PrimaryButton } from '../../../src/components/common/PrimaryButton';
import { BackButton } from '../../../src/components/common/BackButton';
import { useResults, usePlayerMedals } from '../../../src/features/player/achievements';
import { ops } from '../../../src/features/organizer/operations';
import {
  findFinalFixture,
  getFixtureRunnerUp,
  getFixtureWinner,
  normalizeFixtureResponse,
} from '../../../src/features/player/tournamentResults';
import { TournamentIcon } from '../tournaments';

const date = (v?: string) =>
  v
    ? new Date(v).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : 'Not available';
const time = (v?: string) => {
  if (!v) return null;
  const [h, m] = String(v).split(':');
  const hour = Number(h);
  if (Number.isNaN(hour)) return null;
  const period = hour >= 12 ? 'PM' : 'AM';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${m ?? '00'} ${period}`;
};
const status = (t: any) => {
  if (t?.status === 'COMPLETED' || t?.completionStatus === 'COMPLETED') return 'COMPLETED';
  const end = String(t?.registrationCloseDate || t?.registrationEndDate || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(end) && new Date().toISOString().slice(0, 10) > end
    ? 'CLOSED'
    : 'OPEN';
};
const STATUS_LABEL: Record<string, string> = {
  OPEN: 'OPEN REGISTRATION',
  CLOSED: 'REGISTRATION CLOSED',
  COMPLETED: 'COMPLETED',
};
const STATUS_TONE: Record<string, any> = {
  OPEN: { backgroundColor: colors.lime, color: '#0B3324' },
  CLOSED: { backgroundColor: '#4A3815', color: '#FFD54A', borderWidth: 1, borderColor: '#8B6D22' },
  COMPLETED: { backgroundColor: '#20394B', color: '#A7D5F2', borderWidth: 1, borderColor: '#41677F' },
};

export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useTournament(id),
    pid = useAuthStore((s) => s.user?.playerProfile?.id) || '',
    rs = useRegistrations(pid),
    results = useResults(),
    medals = usePlayerMedals(pid),
    players = usePlayers(),
    t = q.data;
  if (q.isLoading)
    return (
      <ScreenContainer dark>
        <Text style={s.muted}>Loading tournament…</Text>
      </ScreenContainer>
    );
  if (q.isError || !t)
    return (
      <ScreenContainer dark>
        <Text style={s.muted}>Tournament unavailable.</Text>
      </ScreenContainer>
    );
  const st = status(t),
    cats = t.categories || [],
    tid = String(id),
    closeDate = t.registrationCloseDate || t.registrationEndDate,
    daysLeft = closeDate ? Math.max(0, Math.ceil((new Date(closeDate).getTime() - Date.now()) / 86400000)) : null,
    registeredCount = cats.reduce((sum: number, c: any) => sum + Number(c.registeredPlayerCount ?? c.registeredEntryCount ?? c.registeredTeamCount ?? 0), 0),
    description = t.description || t.details || t.summary,
    venueName = t.venue || t.venueName,
    venueAddress = t.location || t.venueAddress,
    venueLine = venueName || venueAddress,
    addressLine = venueName && venueAddress && venueAddress !== venueName ? venueAddress : null,
    startTime = time(t.reportingTime),
    endTime = time(t.endTime || t.closingTime || t.eventEndTime),
    mapQuery = [venueName, venueAddress].filter(Boolean).join(', ');
  return (
    <ScreenContainer dark>
      <ScrollView contentContainerStyle={s.page} style={s.scroll}>
        <ImageBackground
          source={require('../../../assets/images/login-badminton-bg.png')}
          style={s.hero}
          imageStyle={s.heroImage}
        >
          <View style={s.heroOverlay} />
          <View style={s.heroTopRow}>
            <View style={s.brandBlock}>
              <BackButton variant="dark" fallbackRoute="/(player)/tournaments" style={s.back} />
              <Text style={s.brand}>
                Smash<Text style={s.lime}>Point</Text>
              </Text>
              <Text style={s.tagline}>Play. Compete. Belong.</Text>
            </View>
            <View style={s.moreBlock}>
              <Text style={s.moreText}>MORE</Text>
              <Text style={s.moreText}>THAN A GAME</Text>
            </View>
          </View>
          <View style={s.heroFade1} />
          <View style={s.heroFade2} />
        </ImageBackground>
        <View style={s.body}>
          <View style={s.centre}>
            <View style={s.centreTop}>
              <Text style={s.eyebrow}>TOURNAMENT CENTRE</Text>
              <Text style={[s.statusPill, STATUS_TONE[st] || STATUS_TONE.OPEN]}>
                {STATUS_LABEL[st] || st}
              </Text>
            </View>
            <Text style={s.title}>{t.name}</Text>
            <View style={s.centreDetails}>
              <View style={s.centreMeta}>
                {venueLine ? (
                  <View style={s.metaRow}>
                    <TournamentIcon name="location" size={18} />
                    <View style={s.metaCopy}>
                      <Text style={s.meta}>{venueLine}</Text>
                      {addressLine ? <Text style={s.metaSub}>{addressLine}</Text> : null}
                    </View>
                  </View>
                ) : null}
                <View style={s.metaRow}>
                  <TournamentIcon name="calendar" size={18} />
                  <View style={s.metaCopy}>
                    <Text style={s.meta}>{date(t.startDate || t.tournamentDate)}</Text>
                    {startTime ? (
                      <Text style={s.metaSub}>{endTime ? `${startTime} – ${endTime}` : startTime}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share tournament"
                style={s.share}
                onPress={() => Share.share({ message: `${t.name}${venueLine ? ` at ${venueLine}` : ''}` })}
              >
                <View style={s.shareCircle}>
                  <TournamentIcon name="share" size={18} />
                </View>
                <Text style={s.shareText}>Share</Text>
              </Pressable>
            </View>
          </View>

          {description ? (
            <View style={s.section}>
              <Text style={s.heading}>About this tournament</Text>
              <Text style={s.bodyText}>{description}</Text>
            </View>
          ) : null}

          <View style={s.stats}>
            <Stat icon="people" value={registeredCount || '0'} label="Players registered" />
            <Stat icon="trophy" value={cats.length} label="Event categories" />
            <Stat icon="clock" value={daysLeft != null ? daysLeft : '—'} label={daysLeft != null ? 'Days left' : 'Registration timing'} />
          </View>

          <View style={s.sectionHeading}>
            <Text style={s.heading}>Event categories</Text>
            <Text style={s.helper}>Select a category to register</Text>
          </View>
          {cats.length ? (
            cats.map((c: any) => (
              <Category
                key={c.id}
                c={c}
                tid={tid}
                st={st}
                regs={rs.data}
                results={results.data || []}
                players={players.data || []}
                tournamentName={t.name || ''}
              />
            ))
          ) : (
            <View style={s.panel}>
              <Text style={s.muted}>No event categories available.</Text>
            </View>
          )}

          {venueLine ? (
            <View style={s.section}>
              <Text style={s.heading}>Venue information</Text>
              <View style={s.venueCard}>
                <View style={s.venueIconBox}>
                  <TournamentIcon name="map" size={22} />
                </View>
                <View style={s.venueCopy}>
                  <Text style={s.venueTitle}>{venueName || venueLine}</Text>
                  {addressLine ? <Text style={s.metaSub}>{addressLine}</Text> : null}
                </View>
                {mapQuery ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="View venue on map"
                    style={s.mapButton}
                    onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(mapQuery)}`)}
                  >
                    <TournamentIcon name="map" size={14} />
                    <Text style={s.mapButtonText}>View on Map</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={s.section}>
            <Text style={s.heading}>Achievements & medals</Text>
            <View style={s.medals}>
              <View style={s.medalIconBox}>
                <TournamentIcon name="medal" size={22} />
              </View>
              <View style={s.medalCopy}>
                <Text style={s.muted}>
                  {(medals.data || []).some((m: any) => String(m.tournamentId || '') === String(id))
                    ? '🏆 Medal earned in this tournament'
                    : 'No medal earned in this tournament yet.'}
                </Text>
                <Text style={s.medalHint}>Compete and win to earn your medals!</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function Category({ c, tid, st, regs, results, players, tournamentName }: {
  c: any; tid: string; st: string; regs: any; results: any[]; players: any[]; tournamentName: string;
}) {
  const [open, setOpen] = useState(false),
    registered = isPlayerRegisteredForCategory(regs, tid, c.id);
  const result = results.find(
    (r) => String(r.tournamentId) === tid && (!r.categoryId || String(r.categoryId) === String(c.id)),
  );
  const viewFixtures = () => {
    router.push({
      pathname: '/(player)/tournament/fixtures',
      params: { tournamentId: tid, categoryId: String(c.id) },
    });
  };
  const fixtures = useQuery({
    queryKey: ['player-fixtures', tid, String(c.id)],
    queryFn: () => ops.fixtures(tid, String(c.id)).then((response) => response.data),
    enabled: open && st === 'COMPLETED',
    staleTime: 0,
    refetchOnMount: true,
  });
  const raw = Array.isArray(fixtures.data)
    ? fixtures.data
    : fixtures.data?.fixtures || fixtures.data?.data || fixtures.data?.items || [];
  const normalized = normalizeFixtureResponse(raw);
  const matching = normalized.filter((fixture) => {
    const fixtureTournamentId = fixture.tournamentId ?? fixture.tournament_id ?? fixture.tournament?.id;
    const fixtureCategoryId =
      fixture.categoryId ?? fixture.category_id ?? fixture.tournamentCategoryId ?? fixture.tournament_category_id ?? fixture.category?.id;
    return (
      (!fixtureTournamentId || String(fixtureTournamentId) === tid) &&
      (!fixtureCategoryId || String(fixtureCategoryId) === String(c.id))
    );
  });
  const final = findFinalFixture(matching);
  const winner = getFixtureWinner(final, players),
    runnerUp = getFixtureRunnerUp(final, players);
  const rules = [
    c.minAge != null && `Age ${c.minAge}–${c.maxAge ?? 'No max'}`,
    c.genderEligibility,
    c.maxTeams != null && `${c.maxTeams} teams`,
  ].filter(Boolean).join(' · ');
  return (
    <View style={s.category}>
      <View style={s.categoryRow}>
        <Pressable style={s.categoryMain} onPress={() => setOpen(!open)}>
          <View style={s.categoryIcon}>
            <TournamentIcon name={c.eventType === 'DOUBLES' ? 'people' : 'single'} size={22} />
          </View>
          <View style={s.categoryCopy}>
            <Text style={s.type}>{c.eventType || 'EVENT'}</Text>
            <Text style={s.catName}>{c.name || c.eventType}</Text>
            {rules ? <Text style={s.rules}>{rules}</Text> : null}
          </View>
        </Pressable>
        {registered ? (
          <View style={s.registeredPill}>
            <Text style={s.registeredPillText}>✓ Registered</Text>
          </View>
        ) : st === 'CLOSED' ? (
          <View style={s.closedPill}>
            <Text style={s.closedPillText}>Closed</Text>
          </View>
        ) : st === 'COMPLETED' ? null : (
          <Pressable
            accessibilityRole="button"
            style={s.registerButton}
            onPress={() =>
              router.push({
                pathname:
                  c.eventType === 'DOUBLES'
                    ? '/(player)/tournament/partner'
                    : '/(player)/tournament/singles-confirm',
                params: {
                  id: tid,
                  categoryId: String(c.id),
                  tournamentName,
                  categoryName: c.name || '',
                  eventType: c.eventType || '',
                },
              })
            }
          >
            <Text style={s.registerButtonText}>Register</Text>
          </Pressable>
        )}
      </View>
      {st === 'COMPLETED' &&
        (fixtures.isLoading ? (
          <Text style={s.muted}>Loading result…</Text>
        ) : (
          <Result winner={winner} runnerUp={runnerUp} fallback={result} />
        ))}
      {(st === 'COMPLETED' || registered) && (
        <PrimaryButton title="View Fixtures →" onPress={viewFixtures} />
      )}
    </View>
  );
}
function Stat({ icon, value, label }: { icon: 'people' | 'trophy' | 'clock'; value: string | number; label: string }) {
  return (
    <View style={s.stat}>
      <View style={s.statTop}>
        <TournamentIcon name={icon} size={19} />
        <Text style={s.statValue}>{value}</Text>
      </View>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}
function Result({ winner, runnerUp, fallback }: { winner: string[]; runnerUp: string[]; fallback?: any }) {
  // /api/results (`fallback` here) is the backend-authoritative source; the fixture-derived winner/runnerUp
  // (computed by walking raw match data) is only used when a result hasn't been generated yet.
  const apiWinner = fallback?.winnerName || fallback?.winner?.name;
  const apiRunnerUp = fallback?.runnerUpName || fallback?.runnerUp?.name;
  const w = apiWinner || (winner.length ? winner.join(' / ') : undefined);
  const r = apiRunnerUp || (runnerUp.length ? runnerUp.join(' / ') : undefined);
  return (
    <View style={s.result}>
      <Text style={s.resultText}>🏆 Winner: {w || 'Winner unavailable'}</Text>
      <Text style={s.resultText}>🥈 Runner-up: {r || 'Runner-up unavailable'}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  scroll: { backgroundColor: '#031A16' },
  page: { paddingBottom: 80 },
  muted: { color: '#A8B6B1', fontSize: 13 },
  hero: { minHeight: 210, paddingTop: 8 },
  heroImage: { resizeMode: 'cover' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2, 27, 21, 0.62)' },
  heroFade1: { position: 'absolute', left: 0, right: 0, bottom: -1, height: 40, backgroundColor: 'rgba(3, 26, 22, 0.55)' },
  heroFade2: { position: 'absolute', left: 0, right: 0, bottom: -1, height: 18, backgroundColor: '#031A16' },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6 },
  brandBlock: { flexShrink: 1 },
  back: { marginBottom: spacing.sm },
  brand: { color: colors.white, fontSize: 26, fontWeight: '900', marginTop: 2 },
  tagline: { color: '#B7C9C1', fontSize: 12, marginTop: 3 },
  lime: { color: colors.lime },
  moreBlock: { alignItems: 'flex-end', paddingTop: 30 },
  moreText: { color: '#CFE0D8', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textAlign: 'right' },
  body: { paddingHorizontal: 20 },
  centre: {
    backgroundColor: 'rgba(8, 43, 36, 0.85)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#125A44',
    padding: 18,
    marginTop: -34,
  },
  centreTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  eyebrow: { color: colors.lime, fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
    overflow: 'hidden',
  },
  title: { color: colors.white, fontSize: 24, fontWeight: '900', marginTop: 10, marginBottom: 4 },
  centreDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 },
  centreMeta: { flex: 1, gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  metaCopy: { flex: 1 },
  meta: { color: colors.white, fontSize: 13, fontWeight: '700' },
  metaSub: { color: '#8FA59B', fontSize: 11, marginTop: 2 },
  share: { alignItems: 'center', marginLeft: 12 },
  shareCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  shareText: { color: colors.lime, fontWeight: '800', fontSize: 10, marginTop: 4 },
  section: { marginTop: 26 },
  heading: { color: colors.white, fontSize: 19, fontWeight: '900' },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginTop: 26 },
  helper: { color: '#83988F', fontSize: 11, flexShrink: 1, textAlign: 'right' },
  panel: { backgroundColor: '#06251F', borderRadius: 16, borderWidth: 1, borderColor: '#0D6049', padding: 16, marginTop: 12 },
  bodyText: { color: '#B6C7C0', fontSize: 13, lineHeight: 20, marginTop: 8, maxWidth: 640 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 22 },
  stat: { flex: 1, backgroundColor: '#06251F', borderRadius: 15, borderWidth: 1, borderColor: '#0D6049', paddingVertical: 14, paddingHorizontal: 12 },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statValue: { color: colors.white, fontSize: 19, fontWeight: '900' },
  statLabel: { color: '#8FA59B', fontSize: 10, marginTop: 6 },
  category: { backgroundColor: '#06251F', borderRadius: 17, borderWidth: 1, borderColor: '#0D6049', padding: 14, marginTop: 12, gap: 10 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryMain: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, gap: 11 },
  categoryIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#124C40', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  type: { color: colors.lime, fontSize: 10, fontWeight: '900' },
  categoryCopy: { flex: 1, minWidth: 0 },
  catName: { color: colors.white, fontSize: 16, fontWeight: '900', marginTop: 3 },
  rules: { color: '#A8B6B1', fontSize: 11, marginTop: 4 },
  registerButton: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, flexShrink: 0 },
  registerButtonText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  registeredPill: { backgroundColor: '#DDF4E6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexShrink: 0 },
  registeredPillText: { color: '#16603F', fontWeight: '900', fontSize: 12 },
  closedPill: { backgroundColor: '#4A3815', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#8B6D22', flexShrink: 0 },
  closedPillText: { color: '#FFD54A', fontWeight: '900', fontSize: 11 },
  result: { backgroundColor: '#E8EEF0', borderRadius: 12, padding: 12 },
  resultText: { color: '#15231F', fontWeight: '800', marginBottom: 5 },
  venueCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#06251F', borderWidth: 1, borderColor: '#0D6049', borderRadius: 16, padding: 14, marginTop: 12, gap: 12 },
  venueIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#124C40', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  venueCopy: { flex: 1, minWidth: 0 },
  venueTitle: { color: colors.white, fontSize: 15, fontWeight: '900' },
  mapButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.lime, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, flexShrink: 0 },
  mapButtonText: { color: colors.lime, fontWeight: '800', fontSize: 11 },
  medals: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#06251F', borderWidth: 1, borderColor: '#0D6049', borderRadius: 16, padding: 16, marginTop: 12, gap: 12 },
  medalIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#124C40', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  medalCopy: { flex: 1 },
  medalHint: { color: '#82988E', fontSize: 11, marginTop: 5 },
});
