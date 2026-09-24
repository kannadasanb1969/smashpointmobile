import { Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { BackButton } from '../../src/components/common/BackButton';
import { useAuthStore } from '../../src/store/authStore';
import { usePlayerMedals } from '../../src/features/player/achievements';
import { colors } from '../../src/theme';
export default function Medals() {
  const id = useAuthStore((s) => s.user?.playerProfile?.id) || '';
  const q = usePlayerMedals(id);
  return (
    <ScreenContainer>
      <ScrollView
        refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} />}
      >
        <BackButton />
        <Text style={s.title}>Medal History</Text>
        {q.isLoading && <Text>Loading medals…</Text>}
        {q.isError && (
          <Text style={s.error}>Unable to load medal history. Retry by pulling down.</Text>
        )}
        {!q.isLoading && !q.isError && !(q.data || []).length && (
          <Text style={s.meta}>No medals yet.</Text>
        )}
        {(q.data || []).map((m) => (
          <Text key={m.id} style={s.card}>
            🏅 {m.position || m.medalType || 'Medal'} · {m.tournamentName || 'Tournament'} ·{' '}
            {m.categoryName || 'Category'}
            {m.achievedAt ? ` · ${m.achievedAt}` : ''}
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
