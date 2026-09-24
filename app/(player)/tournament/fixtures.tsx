import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { BackButton } from '../../../src/components/common/BackButton';
import { ops } from '../../../src/features/organizer/operations';
import {
  fixtureLabel,
  groupFixtures,
  visibleFixtures,
} from '../../../src/features/organizer/fixtureHelpers';
import { useTournament, usePlayers } from '../../../src/features/player/api';
import { colors, shadows } from '../../../src/theme';
import { StatusBadge } from '../../../src/components/common/StatusBadge';
import {
  findFinalFixture,
  getFixtureRunnerUp,
  getFixtureWinner,
  normalizeFixtureResponse,
  participantNames,
} from '../../../src/features/player/tournamentResults';

const value = (object: any, ...keys: string[]) =>
  keys
    .map((key) => object?.[key])
    .find((item) => item !== undefined && item !== null && item !== '');
const sideValue = (fixture: any, side: 1 | 2) =>
  value(
    fixture,
    `participant${side}`,
    `player${side}`,
    `team${side}`,
    `side${side}`,
    `participant${side}Id`,
    `participant${side}_id`,
    `player${side}Id`,
    `player${side}_id`,
    `team${side}Id`,
    `team${side}_id`,
    `participant${side}Name`,
    `participant${side}_name`,
    `player${side}Name`,
    `player${side}_name`,
    `team${side}Name`,
    `team${side}_name`,
  );
const sideId = (side: any) =>
  String(
    typeof side === 'string' || typeof side === 'number'
      ? side
      : value(
          side,
          'id',
          'playerId',
          'player_id',
          'teamId',
          'team_id',
          'participantId',
          'participant_id',
        ) || '',
  );
const sideNames = (side: any, players: any[] = []): string[] => {
  if (side == null || side === '') return ['TBD'];
  const names = participantNames(side);
  if (names.length && !/^[0-9a-f-]{20,}$/i.test(names[0])) return names;
  const id =
    typeof side === 'string' || typeof side === 'number'
      ? String(side)
      : String(side?.id || side?.playerId || side?.teamId || '');
  const player = players.find(
    (item) => String(item?.id ?? item?.playerId ?? item?.player_id) === id,
  );
  if (player) return participantNames(player);
  const label = fixtureLabel(side);
  return label === 'TBD' && typeof side === 'object'
    ? ['Participant details unavailable']
    : [label];
};
const readableRound = (round: unknown) =>
  String(round || 'Fixtures')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const matchStatus = (fixture: any) => {
  const raw = String(
    value(fixture, 'matchStatus', 'match_status', 'status') || 'UPCOMING',
  ).toUpperCase();
  return raw === 'PUBLISHED' || raw === 'SCHEDULED' ? 'UPCOMING' : raw;
};
const score = (fixture: any, side: 1 | 2) =>
  value(
    fixture,
    `participant${side}Score`,
    `participant${side}_score`,
    `player${side}Score`,
    `player${side}_score`,
    `score${side}`,
  );
const winningPoints = (fixture: any) => {
  const config = value(fixture, 'scoringConfig', 'scoring_config');
  return (
    value(
      fixture,
      'winningPoints',
      'winning_points',
      'targetPoints',
      'target_points',
      'pointsToWin',
      'points_to_win',
    ) ??
    (typeof config === 'object'
      ? value(config, 'winningPoints', 'winning_points', 'targetPoints', 'target_points')
      : undefined)
  );
};

const fixtureWinnerSide = (fixture: any): 1 | 2 | null => {
  const explicit = value(fixture, 'winnerSide', 'winner_side');
  if (explicit === 1 || explicit === '1' || explicit === 'A' || explicit === 'PLAYER_1') return 1;
  if (explicit === 2 || explicit === '2' || explicit === 'B' || explicit === 'PLAYER_2') return 2;
  const winnerId = String(
    value(
      fixture,
      'winnerParticipantId',
      'winner_participant_id',
      'winnerPlayerId',
      'winner_player_id',
      'winnerTeamId',
      'winner_team_id',
    ) || '',
  );
  if (winnerId && winnerId === sideId(sideValue(fixture, 1))) return 1;
  if (winnerId && winnerId === sideId(sideValue(fixture, 2))) return 2;
  const a = Number(score(fixture, 1)),
    b = Number(score(fixture, 2));
  return matchStatus(fixture) === 'COMPLETED' && Number.isFinite(a) && Number.isFinite(b) && a !== b
    ? a > b
      ? 1
      : 2
    : null;
};
export default function PlayerFixtures() {
  const params = useLocalSearchParams<{
    tournamentId?: string | string[];
    categoryId?: string | string[];
  }>();
  const tournamentId = String(
    Array.isArray(params.tournamentId) ? params.tournamentId[0] || '' : params.tournamentId || '',
  );
  const categoryId = String(
    Array.isArray(params.categoryId) ? params.categoryId[0] || '' : params.categoryId || '',
  );
  const tournament = useTournament(tournamentId);
  const players = usePlayers();
  const query = useQuery({
    queryKey: ['player-fixtures', tournamentId, categoryId],
    queryFn: () => ops.fixtures(tournamentId, categoryId).then((response) => response.data),
    enabled: Boolean(tournamentId && categoryId),
  });
  const raw = Array.isArray(query.data)
    ? query.data
    : query.data?.fixtures || query.data?.data || query.data?.items || [];
  const fixtures = visibleFixtures(normalizeFixtureResponse(raw), categoryId) as any[];
  const [tab, setTab] = useState<'BRACKET' | 'MATCHES'>('BRACKET');
  const category = tournament.data?.categories?.find((item: any) => String(item.id) === categoryId);
  const final = findFinalFixture(fixtures);
  const winner = getFixtureWinner(final, players.data || []);
  const runnerUp = getFixtureRunnerUp(final, players.data || []);
  const title =
    tournament.data?.name ||
    raw[0]?.tournamentName ||
    raw[0]?.tournament_name ||
    'Tournament fixtures';
  const categoryName =
    category?.name ||
    category?.eventType ||
    raw[0]?.categoryName ||
    raw[0]?.category_name ||
    'Selected category';
  const isDoubles =
    String(category?.eventType || raw[0]?.eventType || '').toUpperCase() === 'DOUBLES';
  const participantCount = new Set(
    fixtures.flatMap((fixture) =>
      [sideId(sideValue(fixture, 1)), sideId(sideValue(fixture, 2))].filter(Boolean),
    ),
  ).size;
  const summaryCount = participantCount
    ? `${participantCount} ${isDoubles ? 'Teams' : 'Players'}`
    : 'Draw details available';

  if (!tournamentId || !categoryId)
    return (
      <ScreenContainer dark>
        <Text style={s.error}>Unable to load fixtures</Text>
      </ScreenContainer>
    );
  return (
    <ScreenContainer dark>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching || tournament.isFetching}
            onRefresh={() => {
              void query.refetch();
              void tournament.refetch();
            }}
            tintColor={colors.lime}
          />
        }
        contentContainerStyle={s.page}
      >
        <BackButton variant="dark" style={s.back} />
        <View style={s.hero}>
          <Text style={s.eyebrow}>MY MATCH CENTRE</Text>
          <Text style={s.title}>Fixture - Knockout</Text>
          <Text style={s.subtitle}>Follow your team’s draw, match status, and scores.</Text>
        </View>
        <View style={s.tabs}>
          <Text onPress={() => setTab('BRACKET')} style={[s.tab, tab === 'BRACKET' && s.tabActive]}>
            Bracket
          </Text>
          <Text onPress={() => setTab('MATCHES')} style={[s.tab, tab === 'MATCHES' && s.tabActive]}>
            Matches
          </Text>
        </View>
        {query.isLoading || tournament.isLoading ? (
          <View style={s.loading}>
            <ActivityIndicator color={colors.lime} size="large" />
            <Text style={s.muted}>Loading fixtures…</Text>
          </View>
        ) : query.isError ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Unable to load fixtures</Text>
            <Text style={s.muted}>Pull to refresh and try again.</Text>
          </View>
        ) : (
          <>
            <View style={s.summary}>
              <View style={s.summaryCopy}>
                <Text style={s.summaryTitle}>{title}</Text>
                <Text style={s.summaryCategory}>{categoryName} Fixture</Text>
                <Text style={s.summaryStatus}>Live draw published</Text>
              </View>
              <Text style={s.count}>{summaryCount}</Text>
            </View>
            {!!final && (winner.length || runnerUp.length) ? (
              <View style={s.podium}>
                <Podium label="🏆 WINNER" names={winner} gold />
                <Podium label="🥈 RUNNER-UP" names={runnerUp} />
              </View>
            ) : null}
            {!fixtures.length ? (
              <View style={s.empty}>
                <Text style={s.emptyTitle}>Fixtures not published yet</Text>
                <Text style={s.muted}>Check back once the organizer publishes the draw.</Text>
              </View>
            ) : tab === 'BRACKET' ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.bracket}
              >
                {groupFixtures(fixtures).map((group, groupIndex) => (
                  <View key={group.round} style={s.roundColumn}>
                    <Text style={s.round}>🏆 {readableRound(group.round)}</Text>
                    <Text style={s.matchCount}>
                      ({group.fixtures.length} {group.fixtures.length === 1 ? 'match' : 'matches'})
                    </Text>
                    {group.fixtures.map((fixture: any, index: number) => (
                      <BracketMatch
                        key={fixture.id || index}
                        fixture={fixture}
                        index={index}
                        players={players.data || []}
                        lastRound={groupIndex === groupFixtures(fixtures).length - 1}
                      />
                    ))}
                  </View>
                ))}
              </ScrollView>
            ) : (
              groupFixtures(fixtures).map((group) => (
                <View key={group.round}>
                  <Text style={s.round}>🏆 {readableRound(group.round)}</Text>
                  {group.fixtures.map((fixture: any, index: number) => (
                    <Match
                      key={fixture.id || index}
                      fixture={fixture}
                      index={index}
                      players={players.data || []}
                    />
                  ))}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function Podium({ label, names, gold }: { label: string; names: string[]; gold?: boolean }) {
  return (
    <View style={[s.podiumCard, gold ? s.gold : s.silver]}>
      <Text style={s.podiumLabel}>{label}</Text>
      {names.length ? (
        names.map((name, index) => (
          <Text key={`${name}-${index}`} style={s.podiumName}>
            {name}
          </Text>
        ))
      ) : (
        <Text style={s.podiumFallback}>Result details available in Fixtures</Text>
      )}
    </View>
  );
}

function Match({ fixture, index, players }: { fixture: any; index: number; players: any[] }) {
  const status = matchStatus(fixture),
    bye =
      status === 'BYE' ||
      sideNames(sideValue(fixture, 1), players).includes('BYE') ||
      sideNames(sideValue(fixture, 2), players).includes('BYE');
  const first = sideNames(sideValue(fixture, 1), players),
    second = sideNames(sideValue(fixture, 2), players),
    winnerSide = fixtureWinnerSide(fixture);
  const id =
    value(fixture, 'shortId', 'matchCode', 'match_code') ||
    value(fixture, 'matchNumber', 'match_number', 'matchOrder', 'match_order') ||
    String(fixture.id || index + 1).slice(-6);
  const target = winningPoints(fixture);
  return (
    <View style={s.match}>
      <View style={s.matchTop}>
        <Text style={s.matchId}>
          M{id} · {status}
        </Text>
        <StatusBadge
          label={status}
          tone={
            status === 'COMPLETED'
              ? 'success'
              : status === 'LIVE'
                ? 'error'
                : status === 'BYE'
                  ? 'info'
                  : 'neutral'
          }
        />
      </View>
      {target != null && <Text style={s.rule}>Playing to {String(target)} · Win by 2</Text>}
      {bye ? (
        <>
          <Text style={s.byeName}>
            {first[0] === 'BYE' ? second.join(' / ') : first.join(' / ')}
          </Text>
          <Text style={s.byeText}>Advances by BYE</Text>
        </>
      ) : (
        <>
          {first.map((name, index) => (
            <ScoreRow
              key={`a-${name}-${index}`}
              name={name}
              score={score(fixture, 1)}
              winner={winnerSide === 1}
            />
          ))}
          {second.map((name, index) => (
            <ScoreRow
              key={`b-${name}-${index}`}
              name={name}
              score={score(fixture, 2)}
              winner={winnerSide === 2}
            />
          ))}
          {status === 'COMPLETED' && winnerSide ? (
            <Text style={s.winner}>
              🏆 Winner: {(winnerSide === 1 ? first : second).join(' / ')}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}
function BracketMatch({
  fixture,
  index,
  players,
  lastRound,
}: {
  fixture: any;
  index: number;
  players: any[];
  lastRound: boolean;
}) {
  const status = matchStatus(fixture);
  const first = sideNames(sideValue(fixture, 1), players).join(' / ');
  const second = sideNames(sideValue(fixture, 2), players).join(' / ');
  const matchCode =
    value(fixture, 'shortId', 'matchCode', 'match_code') ||
    value(fixture, 'matchNumber', 'match_number', 'matchOrder', 'match_order') ||
    String(fixture.id || index + 1).slice(-6);
  return (
    <View style={s.bracketNode}>
      <View style={s.bracketNodeHeader}>
        <Text style={s.bracketMatchCode}>M{matchCode}</Text>
        <Text
          style={[
            s.bracketStatus,
            status === 'LIVE'
              ? s.bracketLive
              : status === 'COMPLETED'
                ? s.bracketCompleted
                : s.bracketScheduled,
          ]}
        >
          {status}
        </Text>
      </View>
      <Text numberOfLines={1} style={s.bracketParticipant}>
        {first}
      </Text>
      <Text style={s.bracketVs}>vs</Text>
      <Text numberOfLines={1} style={s.bracketParticipant}>
        {second}
      </Text>
      {!lastRound && <View pointerEvents="none" style={s.connector} />}
    </View>
  );
}
function ScoreRow({ name, score, winner }: { name: string; score: unknown; winner: boolean }) {
  return (
    <View style={[s.player, winner && s.winningRow]}>
      <Text style={s.playerName}>{name}</Text>
      <Text style={s.score}>{score == null ? '—' : String(score)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: { paddingBottom: 70 },
  back: { marginBottom: 6 },
  hero: {
    backgroundColor: '#082B24',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0D6049',
    padding: 20,
    marginBottom: 12,
  },
  eyebrow: { color: colors.lime, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: colors.white, fontSize: 29, fontWeight: '900', marginTop: 10 },
  subtitle: { color: '#A8B6B1', fontSize: 13, lineHeight: 19, marginTop: 8 },
  tabs: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  tab: {
    color: '#A8B6B1',
    backgroundColor: '#082B24',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#18553F',
    paddingHorizontal: 16,
    paddingVertical: 9,
    fontWeight: '900',
  },
  tabActive: { color: '#082B24', backgroundColor: colors.lime, borderColor: colors.lime },
  summary: {
    backgroundColor: '#102D35',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryCopy: { flex: 1 },
  summaryTitle: { color: colors.white, fontSize: 20, fontWeight: '900' },
  summaryCategory: { color: '#B7E3C8', fontSize: 14, fontWeight: '800', marginTop: 6 },
  summaryStatus: { color: colors.lime, fontSize: 11, marginTop: 7 },
  count: { color: colors.white, fontWeight: '900', fontSize: 12, marginLeft: 10 },
  podium: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  podiumCard: { flex: 1, borderRadius: 15, padding: 14, minHeight: 92 },
  gold: { backgroundColor: '#3A3320' },
  silver: { backgroundColor: '#26343D' },
  podiumLabel: { color: '#D7E0DB', fontSize: 10, fontWeight: '900', marginBottom: 8 },
  podiumName: { color: colors.white, fontSize: 16, fontWeight: '900', marginTop: 2 },
  podiumFallback: { color: '#B6C5C0', fontSize: 11 },
  bracket: { gap: 18, paddingBottom: 18, paddingTop: 8 },
  roundColumn: { width: 205 },
  round: {
    color: colors.lime,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 4,
  },
  matchCount: { color: '#A8B6B1', fontSize: 11, marginBottom: 12 },
  bracketNode: {
    backgroundColor: '#F5F8F7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C9DAD2',
    padding: 12,
    marginBottom: 20,
    minHeight: 102,
    justifyContent: 'center',
    position: 'relative',
    ...shadows.card,
  },
  bracketNodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bracketMatchCode: { color: '#526575', fontSize: 10, fontWeight: '900' },
  bracketStatus: {
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontSize: 8,
    fontWeight: '900',
  },
  bracketScheduled: { color: '#9B650B', backgroundColor: '#FFF0D8' },
  bracketLive: { color: colors.sport, backgroundColor: '#D7F6E7' },
  bracketCompleted: { color: colors.info, backgroundColor: '#E3EEF8' },
  bracketParticipant: { color: '#15231F', fontSize: 14, fontWeight: '800' },
  bracketVs: { color: '#8A9892', fontSize: 10, fontWeight: '800', marginVertical: 2 },
  connector: {
    position: 'absolute',
    right: -19,
    top: '50%',
    width: 19,
    height: 1,
    backgroundColor: colors.lime,
  },
  match: { backgroundColor: '#E8EEF0', borderRadius: 16, padding: 15, marginBottom: 12 },
  matchTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  matchId: { color: '#526575', fontSize: 12, fontWeight: '900', flex: 1 },
  rule: { color: '#718087', fontSize: 10, marginVertical: 10 },
  player: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#D0D9DD',
  },
  winningRow: { backgroundColor: '#DDEFE3' },
  playerName: { color: '#15231F', fontSize: 15, fontWeight: '800', flex: 1 },
  score: { color: '#15231F', fontSize: 19, fontWeight: '900' },
  winner: { color: '#16603F', fontSize: 12, fontWeight: '900', marginTop: 10 },
  byeName: { color: '#15231F', fontSize: 16, fontWeight: '900', marginTop: 15 },
  byeText: { color: '#70509A', fontSize: 12, fontWeight: '800', marginTop: 7 },
  loading: { alignItems: 'center', gap: 12, padding: 30 },
  empty: {
    backgroundColor: '#06251F',
    borderWidth: 1,
    borderColor: '#0D6049',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
  },
  emptyTitle: { color: colors.white, fontSize: 17, fontWeight: '900', marginBottom: 7 },
  muted: { color: '#A8B6B1', fontSize: 13, textAlign: 'center' },
  error: { color: '#FF9B9B', padding: 20 },
});
