import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { matchParticipant } from '../../features/organizer/fixtureHelpers';
import { TournamentIcon } from '../common/TournamentIcon';
import { colors, radius, spacing } from '../../theme';

// The match model stores one authoritative score per participant (not per-game/set scores).
function ScoreBoxes({ value }: { value: number | null }) {
  return (
    <View style={m.scoreBoxRow}>
      <View style={m.scoreBox}>
        <Text style={m.scoreBoxText}>{value != null ? value : '-'}</Text>
      </View>
    </View>
  );
}

const formatMatchDateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${day} • ${time}`;
};

type FilterTab = 'UPCOMING' | 'COMPLETED' | 'ALL';

type Props = {
  matches: any[];
  participants: any[];
  teamCount: number;
  format?: string;
  onOpenMatch: (matchId: string) => void;
};

const isCompleted = (m: any) => String(m.status).toUpperCase() === 'COMPLETED';

const badgeStyleFor = (m: any) => {
  const autoAdvanced = Boolean(m.isAutoAdvanced || m.is_auto_advanced);
  const status = String(m.status || 'SCHEDULED').toUpperCase();
  if (autoAdvanced) return { bg: '#0F2A3A', border: colors.info, text: colors.info, label: 'BYE' };
  if (status === 'COMPLETED') return { bg: '#0F3A2A', border: colors.success, text: colors.success, label: 'COMPLETED' };
  if (status === 'LIVE') return { bg: '#3A1414', border: colors.error, text: colors.error, label: 'LIVE' };
  const p1 = m.participant1Id ?? m.participant1_id;
  const p2 = m.participant2Id ?? m.participant2_id;
  if (!p1 || !p2) {
    return p1 || p2
      ? { bg: '#3A2E0F', border: colors.warning, text: colors.warning, label: 'PENDING' }
      : { bg: '#26302C', border: colors.muted, text: colors.muted, label: 'NOT READY' };
  }
  return { bg: '#0F2A3A', border: colors.info, text: colors.info, label: 'SCHEDULED' };
};

function MatchRow({
  match,
  participants,
  onOpenMatch,
}: {
  match: any;
  participants: any[];
  onOpenMatch: (matchId: string) => void;
}) {
  const badge = badgeStyleFor(match);
  const autoAdvanced = Boolean(match.isAutoAdvanced || match.is_auto_advanced);
  const completed = isCompleted(match);
  const p1 = match.participant1Id ?? match.participant1_id;
  const p2 = match.participant2Id ?? match.participant2_id;
  // Some fixture responses provide participant objects/names but omit the legacy
  // participant1Id/participant2Id fields. Use the same resolved display values
  // rendered in the card so the action is not hidden for a playable match.
  const ready = [matchParticipant(match, 1, participants), matchParticipant(match, 2, participants)]
    .every((name) => name !== 'TBD' && name !== 'BYE');
  const code = match.matchCode || match.match_code || `Match ${match.matchNumber ?? ''}`;
  const scheduledTime = match.scheduledTime || match.scheduled_time;
  const courtNumber = match.courtNumber ?? match.court_number;
  const p1Score = match.participant1Score ?? match.participant1_score ?? 0;
  const p2Score = match.participant2Score ?? match.participant2_score ?? 0;
  const live = String(match.status || '').toUpperCase() === 'LIVE';
  return (
    <View style={m.card}>
      <View style={m.topRow}>
        <Text style={m.code}>{code}</Text>
        <View style={[m.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
          <Text style={[m.badgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      </View>
      {(scheduledTime || courtNumber) && (
        <Text style={m.meta}>
          {scheduledTime ? formatMatchDateTime(scheduledTime) : ''}
          {scheduledTime && courtNumber ? ' · ' : ''}
          {courtNumber ? `Court ${courtNumber}` : ''}
        </Text>
      )}
      <View style={m.participantRow}>
        <Text style={m.name} numberOfLines={1}>{matchParticipant(match, 1, participants)}</Text>
        <ScoreBoxes value={completed || live ? p1Score : null} />
      </View>
      <View style={m.participantRow}>
        <Text style={m.name} numberOfLines={1}>{matchParticipant(match, 2, participants)}</Text>
        <ScoreBoxes value={completed || live ? p2Score : null} />
      </View>
      {completed ? (
        <Pressable onPress={() => onOpenMatch(String(match.id))}>
          <Text style={m.viewLink}>View Match Details →</Text>
        </Pressable>
      ) : autoAdvanced ? (
        <Text style={m.helper}>Advances by bye</Text>
      ) : ready ? (
        <Pressable style={m.startBtn} onPress={() => onOpenMatch(String(match.id))}>
          <Text style={m.startBtnText}>
            {match.status === 'LIVE' ? '▶ SCORE MATCH' : '▶ START MATCH'}
          </Text>
        </Pressable>
      ) : (
        <Text style={m.helper}>Complete previous round matches</Text>
      )}
    </View>
  );
}

export function MatchesTabView({ matches, participants, teamCount, format, onOpenMatch }: Props) {
  const [tab, setTab] = useState<FilterTab>('UPCOMING');
  const completedMatches = matches.filter(isCompleted);
  const upcomingMatches = matches.filter((x) => !isCompleted(x));
  const sorted = (list: any[]) =>
    [...list].sort(
      (a, b) =>
        (a.roundNumber ?? Number(String(a.round ?? 0))) - (b.roundNumber ?? Number(String(b.round ?? 0))) ||
        (a.matchNumber ?? 0) - (b.matchNumber ?? 0),
    );
  const visible =
    tab === 'UPCOMING' ? sorted(upcomingMatches) : tab === 'COMPLETED' ? sorted(completedMatches) : sorted(matches);

  return (
    <View>
      <View style={s.summaryRow}>
        <View style={s.summaryCell}>
          <TournamentIcon name="people" size={18} />
          <Text style={s.summaryValue}>{teamCount}</Text>
          <Text style={s.summaryLabel}>Teams</Text>
        </View>
        <View style={s.summaryCell}>
          <TournamentIcon name="trophy" size={18} />
          <Text style={s.summaryValue}>{matches.length}</Text>
          <Text style={s.summaryLabel}>Matches</Text>
        </View>
        <View style={s.summaryCell}>
          <TournamentIcon name="check" size={18} />
          <Text style={s.summaryValue}>{completedMatches.length}</Text>
          <Text style={s.summaryLabel}>Completed</Text>
        </View>
        <View style={s.summaryCell}>
          <TournamentIcon name="clock" size={18} />
          <Text style={s.summaryValue}>{upcomingMatches.length}</Text>
          <Text style={s.summaryLabel}>Remaining</Text>
        </View>
      </View>

      <View style={s.filterRow}>
        {(
          [
            ['UPCOMING', `Upcoming (${upcomingMatches.length})`],
            ['COMPLETED', `Completed (${completedMatches.length})`],
            ['ALL', `All (${matches.length})`],
          ] as [FilterTab, string][]
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[s.filterChip, tab === key && s.filterChipActive]}
          >
            <Text style={[s.filterChipText, tab === key && s.filterChipTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {visible.map((match) => (
        <MatchRow
          key={match.id}
          match={match}
          participants={match.participants || participants}
          onOpenMatch={onOpenMatch}
        />
      ))}
      {!visible.length && <Text style={s.empty}>No matches in this view.</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#06251F',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#0D6049',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  summaryCell: { flex: 1, alignItems: 'center', gap: 4 },
  summaryValue: { color: colors.lime, fontSize: 20, fontWeight: '900' },
  summaryLabel: { color: '#A8B6B1', fontSize: 10, marginTop: 2, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  filterChip: {
    backgroundColor: '#082B24',
    borderColor: '#18553F',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  filterChipText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  filterChipTextActive: { color: colors.primaryDark },
  empty: { color: '#A8B6B1', paddingVertical: 20, textAlign: 'center' },
});

const m = StyleSheet.create({
  card: {
    backgroundColor: '#06251F',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#18553F',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { color: colors.white, fontWeight: '900', fontSize: 14 },
  badge: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '900' },
  meta: { color: '#A8B6B1', fontSize: 11, marginTop: 8 },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  name: { color: colors.white, fontSize: 15, fontWeight: '800', flex: 1, marginRight: 8 },
  scoreBoxRow: { flexDirection: 'row', gap: 4 },
  scoreBox: {
    width: 24,
    height: 24,
    borderRadius: radius.small,
    backgroundColor: '#0F2A22',
    borderWidth: 1,
    borderColor: '#18553F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBoxText: { color: colors.lime, fontSize: 12, fontWeight: '900' },
  helper: { color: '#A8B6B1', fontSize: 12, marginTop: 10 },
  viewLink: { color: colors.lime, fontWeight: '900', fontSize: 13, marginTop: 10 },
  startBtn: {
    backgroundColor: colors.lime,
    borderRadius: radius.small,
    paddingVertical: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  startBtnText: { color: colors.primaryDark, fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
});
