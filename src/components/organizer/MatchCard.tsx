import { Pressable, StyleSheet, Text, View } from 'react-native';
import { matchParticipant, roundLabel } from '../../features/organizer/fixtureHelpers';
import { colors, radius, shadows, spacing } from '../../theme';

// Single reusable match row shared by League (Matches tab) and Knockout (Matches tab) — only how the
// caller groups matches (flat, by round, or by pool->round) differs, not this card's rendering.
export function MatchCard({
  match,
  format,
  index,
  onPress,
}: {
  match: any;
  format?: string;
  index?: number;
  onPress: () => void;
}) {
  const autoAdvanced = Boolean(match.isAutoAdvanced || match.is_auto_advanced);
  return (
    <Pressable disabled={autoAdvanced} style={s.matchCard} onPress={onPress}>
      <View style={s.matchTop}>
        <Text style={s.matchCode}>
          {match.matchCode || match.match_code || `Match ${(index ?? 0) + 1}`}
        </Text>
        <Text style={s.status}>{autoAdvanced ? 'AUTO-ADVANCED' : match.status || 'SCHEDULED'}</Text>
      </View>
      <Text style={s.matchRound}>
        {roundLabel(match.roundName || match.round_number || match.round, format)}
      </Text>
      <Text style={s.matchName}>
        {matchParticipant(match, 1)} · {match.participant1Score ?? match.participant1_score ?? 0}
      </Text>
      <Text style={s.matchName}>
        {matchParticipant(match, 2)} · {match.participant2Score ?? match.participant2_score ?? 0}
      </Text>
      <Text style={s.action}>
        {autoAdvanced
          ? 'Advances by bye'
          : match.status === 'LIVE'
            ? 'Score Match  →'
            : match.status === 'COMPLETED'
              ? 'View Match  →'
              : 'Start Match  →'}
      </Text>
    </Pressable>
  );
}
const s = StyleSheet.create({
  matchCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  matchTop: { flexDirection: 'row', justifyContent: 'space-between' },
  matchCode: { color: colors.text, fontWeight: '900' },
  status: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  matchRound: { color: colors.muted, fontSize: 11, marginVertical: 8 },
  matchName: { color: colors.text, fontSize: 16, fontWeight: '800', paddingVertical: 5 },
  action: { color: colors.primary, fontWeight: '900', marginTop: 10 },
});
