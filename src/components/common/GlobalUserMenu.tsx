import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { colors, radius, spacing } from '../../theme';

export function GlobalUserMenu() {
  const [open, setOpen] = useState(false);
  const clearSession = useAuthStore((s) => s.clearSession);
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const setWorkspace = useAuthStore((s) => s.setWorkspace);
  const workspace = useAuthStore((s) => s.activeWorkspace);
  const logout = () =>
    Alert.alert('Logout?', 'Are you sure you want to logout from SmashPoint?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setOpen(false);
          await clearSession();
          await queryClient.cancelQueries();
          queryClient.clear();
          router.replace('/(auth)/login');
        },
      },
    ]);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Account menu"
        onPress={() => setOpen(true)}
        style={styles.trigger}
      >
        <Text style={styles.dots}>⋮</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.menu}>
            {role === 'PLAYER' ? (
              <Pressable
                style={styles.item}
                onPress={() => {
                  setOpen(false);
                  router.push('/(player)/profile');
                }}
              >
                <Text style={styles.itemText}>My Profile</Text>
              </Pressable>
            ) : null}
            {role !== 'ADMIN' ? (
              <Pressable
                style={styles.item}
                onPress={async () => {
                  const next = workspace === 'PLAYER' ? 'ORGANIZER' : 'PLAYER';
                  setOpen(false);
                  await setWorkspace(next);
                  router.replace(next === 'PLAYER' ? '/(player)' : '/(organizer)');
                }}
              >
                <Text style={styles.itemText}>Switch Workspace</Text>
              </Pressable>
            ) : null}
            <Pressable style={[styles.item, styles.logout]} onPress={logout}>
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  trigger: {
    position: 'absolute',
    zIndex: 20,
    top: 46,
    right: 18,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  dots: { color: colors.text, fontSize: 26, lineHeight: 27, fontWeight: '900' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16,35,27,.16)',
    alignItems: 'flex-end',
    paddingTop: 92,
    paddingRight: 18,
  },
  menu: {
    minWidth: 170,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 6,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  item: { paddingHorizontal: spacing.md, paddingVertical: 14, borderRadius: radius.sm },
  itemText: { color: colors.text, fontWeight: '800', fontSize: 15 },
  logout: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 3 },
  logoutText: { color: colors.error, fontWeight: '900', fontSize: 15 },
});
