import { RefreshControl, ScrollView, StyleSheet, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { adminApi } from '../../src/features/admin/api';
import { colors } from '../../src/theme';
export default function Tournaments() {
  const q = useQuery({ queryKey: ['admin-tournaments'], queryFn: adminApi.all });
  const rows = q.data || [];
  return (
    <ScreenContainer>
      <ScrollView
        refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} />}
      >
        <Text onPress={() => router.back()} style={s.back}>
          ‹ Back
        </Text>
        <Text style={s.title}>Tournament Management</Text>
        {q.isLoading && <Text>Loading tournaments…</Text>}
        {q.isError && <Text style={s.error}>Unable to load tournaments. Pull to retry.</Text>}
        {!q.isLoading && !q.isError && !rows.length && (
          <Text style={s.meta}>No tournaments found.</Text>
        )}
        {rows.map((t: any) => (
          <Pressable
            key={t.id}
            style={s.card}
            onPress={() => router.push({ pathname: '/(admin)/review', params: { id: t.id } })}
          >
            <Text style={s.name}>{t.name || 'Unnamed tournament'}</Text>
            <Text style={s.meta}>
              {t.status} · {t.startDate || t.tournamentDate || 'Date not set'}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  back: { color: colors.primary, fontWeight: '700', marginTop: 25 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, marginVertical: 18 },
  card: { backgroundColor: colors.white, padding: 18, borderRadius: 16, marginBottom: 10 },
  name: { fontWeight: '800', fontSize: 17, color: colors.text },
  meta: { color: colors.muted, marginTop: 8 },
  error: { color: colors.error },
});
