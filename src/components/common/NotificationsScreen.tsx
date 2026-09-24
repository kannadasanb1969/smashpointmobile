import { Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { ScreenContainer } from './ScreenContainer';
import { BackButton } from './BackButton';
import { useAuthStore } from '../../store/authStore';
import { useNotifications } from '../../features/player/notifications';
import { colors } from '../../theme';
import { PrimaryButton } from './PrimaryButton';

// Shared by app/(player)/notifications.tsx, app/(organizer)/notifications.tsx and
// app/(admin)/notifications.tsx — identical for all three roles (notifications are filtered
// by recipientId/recipientRole server-side), so this is the one implementation all three render.
export function NotificationsScreen() {
  const id = useAuthStore((s) => s.user?.id) || '';
  const workspace = useAuthStore((s) => s.activeWorkspace);
  const n = useNotifications(id);
  const fallbackRoute =
    workspace === 'ORGANIZER' ? '/(organizer)/' : workspace === 'ADMIN' ? '/(admin)/' : '/(player)/';
  return (
    <ScreenContainer>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={n.list.isFetching}
            onRefresh={() => {
              void n.list.refetch();
              void n.unread.refetch();
            }}
          />
        }
      >
        <BackButton fallbackRoute={fallbackRoute} />
        <Text style={s.title}>Notifications {n.unread.data ? `(${n.unread.data})` : ''}</Text>
        {n.list.isLoading && <Text>Loading notifications…</Text>}
        {n.list.isError && (
          <Text style={s.error}>Unable to load notifications. Retry by pulling down.</Text>
        )}
        {!n.list.isLoading && !n.list.isError && !(n.list.data || []).length && (
          <Text style={s.meta}>No notifications yet.</Text>
        )}
        {(n.list.data || []).map((x) => (
          <Text
            key={x.id}
            onPress={() => !x.isRead && n.read.mutate(x.id)}
            style={[s.card, !x.isRead && s.unread]}
          >
            {x.title || 'Notification'}
            {x.message ? `\n${x.message}` : ''}
          </Text>
        ))}
        {Boolean((n.list.data || []).some((x) => !x.isRead)) && (
          <PrimaryButton title="Mark all as read" onPress={() => n.readAll.mutate()} />
        )}
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
  unread: { borderWidth: 2, borderColor: colors.primary },
  meta: { color: colors.muted, padding: 20 },
  error: { color: colors.error },
});
