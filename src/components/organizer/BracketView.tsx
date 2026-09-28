import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { matchParticipant, roundLabel } from '../../features/organizer/fixtureHelpers';
import { colors, radius, spacing } from '../../theme';

// Compact knockout flow diagram: Quarter Finals -> Semi Finals -> Final side by side (never a vertical
// list — see the approved reference design). Column width is computed from the device width so all
// rounds stay visible together on a single phone screen instead of requiring horizontal scrolling.
type Props = {
  rounds: { round: string; fixtures: any[] }[];
  format?: string;
  onOpenMatch: (matchId: string) => void;
};

const readyState = (m: any) => {
  const p1 = m.participant1Id ?? m.participant1_id;
  const p2 = m.participant2Id ?? m.participant2_id;
  const resolved = [matchParticipant(m, 1, m.participants || []), matchParticipant(m, 2, m.participants || [])]
    .every((name) => name !== 'TBD' && name !== 'BYE');
  if (Boolean(m.isAutoAdvanced || m.is_auto_advanced)) return 'AUTO_ADVANCED';
  if (m.status === 'COMPLETED') return 'COMPLETED';
  if (m.status === 'LIVE') return 'LIVE';
  if ((p1 && p2) || resolved) return 'SCHEDULED';
  if (p1 || p2) return 'PENDING';
  return 'NOT_READY';
};

const badgeStyleFor = (state: string) => {
  switch (state) {
    case 'COMPLETED':
      return { bg: '#0F3A2A', border: colors.success, text: colors.success, label: 'COMPLETED' };
    case 'LIVE':
      return { bg: '#3A1414', border: colors.error, text: colors.error, label: 'LIVE' };
    case 'SCHEDULED':
      return { bg: '#0F2A3A', border: colors.info, text: colors.info, label: 'SCHEDULED' };
    case 'PENDING':
      return { bg: '#3A2E0F', border: colors.warning, text: colors.warning, label: 'PENDING' };
    case 'AUTO_ADVANCED':
      return { bg: '#0F2A3A', border: colors.info, text: colors.info, label: 'BYE' };
    default:
      return { bg: '#26302C', border: colors.muted, text: colors.muted, label: 'NOT READY' };
  }
};

function BracketCard({
  match,
  participants,
  columnWidth,
  onOpenMatch,
}: {
  match: any;
  participants: any[];
  columnWidth: number;
  onOpenMatch: (matchId: string) => void;
}) {
  const state = readyState(match);
  const badge = badgeStyleFor(state);
  const showScores = state === 'COMPLETED';
  const code = match.matchCode || match.match_code || `Match ${match.matchNumber ?? ''}`;
  const p1Score = match.participant1Score ?? match.participant1_score ?? 0;
  const p2Score = match.participant2Score ?? match.participant2_score ?? 0;
  return (
    <View style={[c.card, { width: columnWidth, borderColor: badge.border }]}>
      <View style={c.topRow}>
        <Text style={c.code} numberOfLines={1}>{code}</Text>
        <View style={[c.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
          <Text style={[c.badgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      </View>
      <View style={c.participantRow}>
        <Text style={c.name} numberOfLines={2}>{matchParticipant(match, 1, participants)}</Text>
        {showScores && <Text style={c.score}>{p1Score}</Text>}
      </View>
      <View style={c.participantRow}>
        <Text style={c.name} numberOfLines={2}>{matchParticipant(match, 2, participants)}</Text>
        {showScores && <Text style={c.score}>{p2Score}</Text>}
      </View>
      {state === 'NOT_READY' && (
        <View style={c.helperRow}>
          <Text style={c.helperIcon}>🔒</Text>
          <Text style={c.helper}>Complete previous round matches</Text>
        </View>
      )}
      {state === 'AUTO_ADVANCED' && <Text style={c.helper}>Advances by bye</Text>}
      {state === 'SCHEDULED' && (
        <Pressable style={c.startBtn} onPress={() => onOpenMatch(String(match.id))}>
          <Text style={c.startBtnText}>▶ Start Match</Text>
        </Pressable>
      )}
      {state === 'LIVE' && (
        <Pressable style={c.startBtn} onPress={() => onOpenMatch(String(match.id))}>
          <Text style={c.startBtnText}>Score Match →</Text>
        </Pressable>
      )}
      {state === 'COMPLETED' && (
        <Pressable onPress={() => onOpenMatch(String(match.id))}>
          <Text style={c.viewLink}>View Match →</Text>
        </Pressable>
      )}
    </View>
  );
}

export function BracketView({ rounds, format, onOpenMatch }: Props) {
  const { width } = useWindowDimensions();
  const pageHorizontalPadding = spacing.md * 2;
  const connectorWidth = 10;
  const champColumnWidth = 74;
  const roundsCount = rounds.length;
  const available =
    width - pageHorizontalPadding - connectorWidth * roundsCount - champColumnWidth;
  const columnWidth = Math.max(100, Math.floor(available / Math.max(1, roundsCount)));

  const lastRound = rounds[rounds.length - 1];
  const finalMatch = lastRound && lastRound.fixtures.length === 1 ? lastRound.fixtures[0] : null;
  const finalCompleted = finalMatch && finalMatch.status === 'COMPLETED';
  const winnerId = finalMatch?.winnerId ?? finalMatch?.winner_id;
  const winnerSide =
    winnerId && String(winnerId) === String(finalMatch?.participant1Id ?? finalMatch?.participant1_id)
      ? 1
      : winnerId && String(winnerId) === String(finalMatch?.participant2Id ?? finalMatch?.participant2_id)
        ? 2
        : null;
  const winnerName =
    finalCompleted && winnerSide
      ? matchParticipant(finalMatch, winnerSide, finalMatch.participants || [])
      : null;

  // The knockout engine has no concept of a semifinal-losers "third place" match today — no round/match
  // is ever generated for one — so this only renders if the fixture data itself actually contains one,
  // never as an invented placeholder. `thirdPlaceEnabled` on the tournament only controls the medal/prize
  // display, not bracket generation, so it is deliberately NOT used as the gate here.
  const thirdPlaceMatch = rounds
    .flatMap((r) => r.fixtures)
    .find((m: any) => /THIRD|BRONZE/i.test(String(m.roundName ?? m.round_name ?? '')));

  return (
    <View style={c.wrap}>
      <View style={c.row}>
        {rounds.map((round, ri) => (
          <View key={round.round} style={c.roundGroup}>
            <View style={[c.column, { width: columnWidth }]}>
              <View style={c.roundHeaderBox}>
                <Text style={c.roundTitle}>
                  {roundLabel(round.round, format, { index: ri, total: rounds.length })}
                </Text>
                <Text style={c.roundCount}>
                  {round.fixtures.length} match{round.fixtures.length === 1 ? '' : 'es'}
                </Text>
              </View>
              {round.fixtures.map((m: any) => (
                <BracketCard
                  key={m.id}
                  match={m}
                  participants={m.participants || []}
                  columnWidth={columnWidth}
                  onOpenMatch={onOpenMatch}
                />
              ))}
            </View>
            {ri < rounds.length - 1 && <View style={c.connector} />}
          </View>
        ))}
        <View style={c.connector} />
        <View style={[c.champColumn, { width: champColumnWidth }]}>
          <Text style={c.trophy}>🏆</Text>
          <Text style={c.champLabel} numberOfLines={2}>
            {winnerName || 'CHAMPION'}
          </Text>
        </View>
      </View>

      {thirdPlaceMatch && (
        <View style={c.thirdPlaceSection}>
          <Text style={c.thirdPlaceTitle}>Third Place Match (If Applicable)</Text>
          <View style={c.row}>
            <BracketCard
              match={thirdPlaceMatch}
              participants={thirdPlaceMatch.participants || []}
              columnWidth={columnWidth}
              onOpenMatch={onOpenMatch}
            />
            <View style={c.connector} />
            <View style={[c.champColumn, { width: champColumnWidth }]}>
              <Text style={c.trophy}>🥉</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const c = StyleSheet.create({
  wrap: { paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  roundGroup: { flexDirection: 'row', alignItems: 'flex-start' },
  column: {},
  roundHeaderBox: {
    backgroundColor: '#06251F',
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: '#18553F',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  roundTitle: { color: colors.white, fontWeight: '900', fontSize: 12 },
  roundCount: { color: '#A8B6B1', fontSize: 9, marginTop: 2 },
  connector: {
    width: 10,
    height: 1,
    backgroundColor: colors.lime,
    marginTop: 40,
  },
  champColumn: { alignItems: 'center', paddingTop: 30 },
  trophy: { fontSize: 26 },
  champLabel: {
    color: colors.lime,
    fontWeight: '900',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#06251F',
    borderRadius: radius.small,
    borderWidth: 1,
    padding: 8,
    marginBottom: 12,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  code: { color: '#A8B6B1', fontSize: 9, fontWeight: '900' },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 8, fontWeight: '900' },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  name: { color: colors.white, fontSize: 10, fontWeight: '800', flex: 1, marginRight: 4 },
  score: { color: colors.lime, fontSize: 12, fontWeight: '900' },
  helperRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3 },
  helperIcon: { fontSize: 9 },
  helper: { color: '#A8B6B1', fontSize: 8, marginTop: 4, flexShrink: 1 },
  startBtn: {
    backgroundColor: colors.lime,
    borderRadius: radius.small,
    paddingVertical: 6,
    marginTop: 6,
    alignItems: 'center',
  },
  startBtnText: { color: colors.primaryDark, fontWeight: '900', fontSize: 10 },
  viewLink: { color: colors.lime, fontWeight: '900', fontSize: 10, marginTop: 4 },
  thirdPlaceSection: { marginTop: 24 },
  thirdPlaceTitle: { color: colors.lime, fontWeight: '900', fontSize: 12, marginBottom: 10 },
});
