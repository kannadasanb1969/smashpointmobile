import { Text, StyleSheet, Pressable, RefreshControl, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { adminApi } from '../../src/features/admin/api';
import { useAuthStore } from '../../src/store/authStore';
import { authApi } from '../../src/api/apiClient';
import { colors } from '../../src/theme';
export default function Admin() {
  const q = useQuery({ queryKey: ['admin-pending'], queryFn: adminApi.pending });
  const clearSession = useAuthStore((s) => s.clearSession);
  const rows = q.data || [];
  return (
    <ScreenContainer>
      <ScrollView
        refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} />}
      >
        <Text style={s.kicker}>ADMIN WORKSPACE</Text>
        <Text style={s.title}>Pending approvals</Text>
        {q.isLoading && <Text style={s.meta}>Loading approvals…</Text>}
        {q.isError && <Text style={s.error}>Unable to load approvals. Pull to retry.</Text>}
        {!q.isLoading && !q.isError && !rows.length && (
          <Text style={s.meta}>No tournaments waiting for approval.</Text>
        )}
        {rows.map((x: any) => (
          <Pressable
            key={x.id}
            style={s.card}
            onPress={() => router.push({ pathname: '/(admin)/review', params: { id: x.id } })}
          >
            <Text style={s.name}>{x.name}</Text>
            <Text style={s.meta}>
              {x.status} · {x.startDate || x.tournamentDate || 'Date not set'}
            </Text>
          </Pressable>
        ))}
        <Text onPress={() => router.push('/(admin)/tournaments')} style={s.manage}>
          Manage tournaments
        </Text>
        <Text onPress={() => router.push('/(admin)/notifications')} style={s.manage}>
          Notifications
        </Text>
        <Text
          onPress={async () => {
            try { await authApi.logout(); } catch { /* local logout must still complete */ }
            await clearSession();
            router.replace('/(auth)/login');
          }}
          style={s.logout}
        >
          Log out
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  kicker: { color: colors.primary, fontWeight: '800', marginTop: 45 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, marginVertical: 18 },
  card: { backgroundColor: colors.white, padding: 18, borderRadius: 16, marginBottom: 10 },
  name: { fontWeight: '800', fontSize: 17, color: colors.text },
  meta: { color: colors.muted, marginTop: 8 },
  error: { color: colors.error },
  manage: { color: colors.primary, fontWeight: '800', textAlign: 'center', marginTop: 24 },
  logout: { color: colors.primary, fontWeight: '700', textAlign: 'center', marginTop: 18 },
});
