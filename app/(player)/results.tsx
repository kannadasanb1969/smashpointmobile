import { Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { useResults } from '../../src/features/player/achievements';
import { colors } from '../../src/theme';
export default function Results() {
  const q = useResults();
  return (
    <ScreenContainer>
      <ScrollView
        refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} />}
      >
        <Text style={s.title}>Results</Text>
        {q.isLoading && <Text>Loading results…</Text>}
        {q.isError && <Text style={s.error}>Unable to load results. Retry by pulling down.</Text>}
        {!q.isLoading && !q.isError && !(q.data || []).length && (
          <Text style={s.meta}>No results yet.</Text>
        )}
        {(q.data || []).map((r: any) => (
          <Text key={r.id} style={s.card}>
            {r.tournamentName || r.tournamentId || 'Tournament'} ·{' '}
            {r.categoryName || r.categoryId || 'Category'}
            {r.winnerName ? ` · Winner: ${r.winnerName}` : ''}
            {r.runnerUpName ? ` · Runner-up: ${r.runnerUpName}` : ''}
          </Text>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '800', color: colors.text, marginTop: 35, marginBottom: 18 },
  card: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    color: colors.text,
  },
  meta: { color: colors.muted, padding: 20 },
  error: { color: colors.error },
});
