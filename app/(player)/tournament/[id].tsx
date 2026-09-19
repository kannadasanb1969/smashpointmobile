import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { useTournament, useRegistrations, usePlayers } from '../../../src/features/player/api';
import { useAuthStore } from '../../../src/store/authStore';
import { isPlayerRegisteredForCategory } from '../../../src/features/player/registration';
import { colors } from '../../../src/theme';
import { PrimaryButton } from '../../../src/components/common/PrimaryButton';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import { useResults, usePlayerMedals } from '../../../src/features/player/achievements';
import { ops } from '../../../src/features/organizer/operations';
import {
  findFinalFixture,
  getFixtureRunnerUp,
  getFixtureWinner,
  normalizeFixtureResponse,
} from '../../../src/features/player/tournamentResults';

const date = (v?: string) =>
  v
    ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Not available';
const status = (t: any) => {
  if (t?.status === 'COMPLETED' || t?.completionStatus === 'COMPLETED') return 'COMPLETED';
  const end = String(t?.registrationCloseDate || t?.registrationEndDate || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(end) && new Date().toISOString().slice(0, 10) > end
    ? 'CLOSED'
    : 'OPEN';
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
    tid = String(id);
  console.log('[DETAIL] tournament id:', tid);
  console.log('[DETAIL] tournament object:', t);
  return (
    <ScreenContainer dark>
      <ScrollView contentContainerStyle={s.page}>
        <Text onPress={() => router.back()} style={s.back}>
          ‹ Back to tournaments
        </Text>
        <Text style={s.brand}>
          Smash<Text style={s.lime}>Point</Text>
        </Text>
        <View style={s.hero}>
          <Text style={s.eyebrow}>TOURNAMENT CENTRE</Text>
          <Text style={s.title}>{t.name}</Text>
          <Text style={s.meta}>
            ⌖ {t.venue || t.venueName || t.location || 'Venue TBC'} · ◷{' '}
            {date(t.startDate || t.tournamentDate)}
          </Text>
          <StatusBadge
            label={
              st === 'COMPLETED'
                ? 'COMPLETED'
                : st === 'CLOSED'
                  ? 'REGISTRATION CLOSED'
                  : 'OPEN REGISTRATION'
            }
            tone={st === 'COMPLETED' ? 'completed' : st === 'CLOSED' ? 'closed' : 'success'}
          />
        </View>
        <Text style={s.heading}>Event categories</Text>
        {cats.map((c: any) => (
          <Category
            key={c.id}
            c={c}
            tid={tid}
            st={st}
            regs={rs.data}
            results={results.data || []}
            players={players.data || []}
          />
        ))}
        <Text style={s.heading}>Achievements & medals</Text>
        <View style={s.medals}>
          <Text style={s.muted}>
            {(medals.data || []).some((m: any) => String(m.tournamentId || '') === String(id))
              ? '🏆 Medal earned in this tournament'
              : 'No medal earned in this tournament yet.'}
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function Category({
  c,
  tid,
  st,
  regs,
  results,
  players,
}: {
  c: any;
  tid: string;
  st: string;
  regs: any;
  results: any[];
  players: any[];
}) {
  const [open, setOpen] = useState(false),
    registered = isPlayerRegisteredForCategory(regs, tid, c.id);
  console.log('[DETAIL] category id:', c.id);
  console.log('[DETAIL] category object:', c);
  const result = results.find(
    (r) =>
      String(r.tournamentId) === tid && (!r.categoryId || String(r.categoryId) === String(c.id)),
  );
  const viewFixtures = () => {
    console.log('[NAV] View Fixtures pressed', { tournamentId: tid, categoryId: String(c.id) });
    router.push({
      pathname: '/(player)/tournament/fixtures',
      params: { tournamentId: tid, categoryId: String(c.id) },
    });
  };
  if (__DEV__)
    console.log('[CATEGORY DEBUG]', { tournamentId: tid, categoryId: String(c.id), registered });
  console.log('[DETAIL] fixture query params:', { tournamentId: tid, categoryId: String(c.id) });
  const fixtures = useQuery({
    queryKey: ['player-fixtures', tid, String(c.id)],
    queryFn: () =>
      ops.fixtures(tid, String(c.id)).then((response) => {
        console.log('[DETAIL] raw fixtures response:', response.data);
        return response.data;
      }),
    enabled: open && st === 'COMPLETED',
    staleTime: 0,
    refetchOnMount: true,
  });
  const raw = Array.isArray(fixtures.data)
    ? fixtures.data
    : fixtures.data?.fixtures || fixtures.data?.data || fixtures.data?.items || [];
  const normalized = normalizeFixtureResponse(raw);
  const matching = normalized.filter((fixture) => {
    const fixtureTournamentId =
      fixture.tournamentId ?? fixture.tournament_id ?? fixture.tournament?.id;
    const fixtureCategoryId =
      fixture.categoryId ??
      fixture.category_id ??
      fixture.tournamentCategoryId ??
      fixture.tournament_category_id ??
      fixture.category?.id;
    return (
      (!fixtureTournamentId || String(fixtureTournamentId) === tid) &&
      (!fixtureCategoryId || String(fixtureCategoryId) === String(c.id))
    );
  });
  const final = findFinalFixture(matching);
  const winner = getFixtureWinner(final, players),
    runnerUp = getFixtureRunnerUp(final, players);
  return (
    <View style={s.category}>
      <Pressable onPress={() => setOpen(!open)}>
        <Text style={s.type}>{c.eventType || 'EVENT'}</Text>
        <Text style={s.catName}>{c.name || c.eventType}</Text>
        <Text style={s.rules}>
          {[
            c.minAge != null && `Age ${c.minAge}–${c.maxAge ?? 'No max'}`,
            c.genderEligibility,
            c.maxTeams != null && `${c.maxTeams} teams`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </Pressable>
      {open && (
        <View style={s.body}>
          {st === 'COMPLETED' &&
            (fixtures.isLoading ? (
              <Text style={s.muted}>Loading result…</Text>
            ) : (
              <Result winner={winner} runnerUp={runnerUp} fallback={result} />
            ))}
          {registered ? (
            <View style={s.registered}>
              <Text style={s.registeredTitle}>✓ Already Registered</Text>
              <Text style={s.muted}>You are already participating in this category.</Text>
            </View>
          ) : st === 'CLOSED' ? (
            <StatusBadge label="REGISTRATION CLOSED" tone="closed" />
          ) : (
            <PrimaryButton
              title="Register"
              onPress={() =>
                router.push({
                  pathname:
                    c.eventType === 'DOUBLES'
                      ? '/(player)/tournament/partner'
                      : '/(player)/tournament/singles-confirm',
                  params: {
                    id: tid,
                    categoryId: String(c.id),
                    tournamentName: '',
                    categoryName: c.name || '',
                  },
                })
              }
            />
          )}
        </View>
      )}
      {(st === 'COMPLETED' || registered) && (
        <PrimaryButton title="View Fixtures →" onPress={viewFixtures} />
      )}
    </View>
  );
}
function Result({
  winner,
  runnerUp,
  fallback,
}: {
  winner: string[];
  runnerUp: string[];
  fallback?: any;
}) {
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
  page: { paddingBottom: 80 },
  muted: { color: '#A8B6B1', fontSize: 13 },
  back: { color: colors.lime, fontWeight: '800', paddingVertical: 10 },
  brand: { color: colors.white, fontSize: 22, fontWeight: '900', marginBottom: 12 },
  lime: { color: colors.lime },
  hero: {
    backgroundColor: '#082B24',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0D6049',
    padding: 19,
  },
  eyebrow: { color: colors.lime, fontSize: 10, fontWeight: '900' },
  title: { color: colors.white, fontSize: 27, fontWeight: '900', marginVertical: 12 },
  meta: { color: '#A8B6B1', fontSize: 13 },
  heading: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 22,
    marginBottom: 10,
  },
  category: {
    backgroundColor: '#06251F',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#0D6049',
    padding: 15,
    marginBottom: 10,
  },
  type: { color: colors.lime, fontSize: 10, fontWeight: '900' },
  catName: { color: colors.white, fontSize: 18, fontWeight: '900', marginTop: 5 },
  rules: { color: '#A8B6B1', fontSize: 11, marginTop: 10 },
  body: { borderTopWidth: 1, borderTopColor: '#18553F', marginTop: 14, paddingTop: 14 },
  registered: { backgroundColor: '#DDF4E6', borderRadius: 12, padding: 12, marginBottom: 10 },
  registeredTitle: { color: '#16603F', fontWeight: '900', marginBottom: 4 },
  result: { backgroundColor: '#E8EEF0', borderRadius: 12, padding: 12, marginBottom: 10 },
  resultText: { color: '#15231F', fontWeight: '800', marginBottom: 5 },
  medals: {
    backgroundColor: '#06251F',
    borderWidth: 1,
    borderColor: '#0D6049',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
});
