import { Alert, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { performLogout } from '../../features/auth/logout';
import { colors, radius, spacing } from '../../theme';
import { playerInitial } from '../../features/player/initials';
import { authApi } from '../../api/apiClient';
import type { User } from '../../types/auth';

export function GlobalUserMenu({ embedded = false, displayName }: { embedded?: boolean; displayName?: string }) {
  const [open, setOpen] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const setWorkspace = useAuthStore((s) => s.setWorkspace);
  const workspace = useAuthStore((s) => s.activeWorkspace || s.user?.role || 'PLAYER');
  const user = useAuthStore((s) => s.user);
  const name = displayName || user?.name || user?.fullName || 'Player';
  const initial = playerInitial(name);
  const workspaceLabel = `${workspace.charAt(0)}${workspace.slice(1).toLowerCase()} Workspace`;
  const logout = () => Alert.alert('Logout?', 'Are you sure you want to sign out from this device?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Logout', style: 'destructive', onPress: async () => { setOpen(false); await performLogout(queryClient); } },
  ]);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Open account menu" onPress={() => setOpen((value) => !value)} style={[styles.trigger, embedded && styles.embeddedTrigger]}><Text style={styles.triggerInitial}>{initial}</Text></Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
        <View style={[styles.anchor, { width: Math.min(screenWidth - 32, 320) }, embedded && styles.embeddedAnchor]}><View style={styles.pointer} />
          <View style={styles.menu} onStartShouldSetResponder={() => true}>
            <View style={styles.accountHeader}><View style={styles.miniAvatar}><Text style={styles.triggerInitial}>{initial}</Text></View><View style={styles.accountCopy}><Text style={styles.accountName} numberOfLines={1}>{name}</Text><Text style={styles.workspace}>{workspaceLabel}</Text></View></View>
            <View style={styles.divider} />
            {role === 'PLAYER' && <MenuRow icon="♙" title="My Profile" subtitle="View and edit your profile" accessibilityLabel="Open my profile" onPress={() => { setOpen(false); router.push('/(player)/profile'); }} />}
            {role !== 'ADMIN' && <MenuRow icon="⇄" title="Switch Workspace" subtitle="Change your account/role" accessibilityLabel="Switch workspace" onPress={async () => { const next = workspace === 'PLAYER' ? 'ORGANIZER' : 'PLAYER'; setOpen(false); try { const response = await authApi.selectWorkspace(next); const data = response.data as { accessToken: string; refreshToken: string; user: User }; await useAuthStore.getState().setAccessSession(data.accessToken, data.refreshToken, data.user); await setWorkspace(next); router.replace(next === 'PLAYER' ? '/(player)' : '/(organizer)'); } catch (e) { Alert.alert('Unable to switch workspace', e instanceof Error ? e.message : 'Please try again.'); } }} />}
            <View style={styles.divider} /><MenuRow icon="↪" title="Logout" subtitle="Sign out from this device" accessibilityLabel="Logout" destructive onPress={logout} />
          </View>
        </View>
      </Pressable>
    </Modal>
  </>;
}
function MenuRow({ icon, title, subtitle, accessibilityLabel, destructive, onPress }: { icon: string; title: string; subtitle: string; accessibilityLabel: string; destructive?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={styles.row} onPress={onPress}><Text style={[styles.rowIcon, destructive && styles.destructive]}>{icon}</Text><View style={styles.rowCopy}><Text style={[styles.rowTitle, destructive && styles.destructive]}>{title}</Text><Text style={styles.rowSubtitle}>{subtitle}</Text></View>{!destructive && <Text style={styles.chevron}>›</Text>}</Pressable>;
}
const styles = StyleSheet.create({
  trigger: { position: 'absolute', zIndex: 20, top: 46, right: 18, width: 54, height: 54, borderRadius: 27, backgroundColor: '#164D3B', borderWidth: 2, borderColor: colors.lime, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  embeddedTrigger: { position: 'relative', top: undefined, right: undefined, zIndex: 2, width: 64, height: 64, borderRadius: 32 }, triggerInitial: { color: colors.lime, fontSize: 23, fontWeight: '900' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,20,15,.22)', alignItems: 'flex-end', paddingTop: 104, paddingRight: 16 }, anchor: { maxWidth: 320 }, embeddedAnchor: { marginTop: 4 }, pointer: { position: 'absolute', top: -7, right: 23, width: 14, height: 14, backgroundColor: '#003D31', borderLeftWidth: 1, borderTopWidth: 1, borderColor: colors.lime, transform: [{ rotate: '45deg' }], zIndex: 1 },
  menu: { backgroundColor: '#003D31', borderRadius: 20, borderWidth: 1, borderColor: colors.lime, padding: spacing.sm, shadowColor: '#000', shadowOpacity: .28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10 }, accountHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm }, miniAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#164D3B', borderWidth: 2, borderColor: colors.lime, alignItems: 'center', justifyContent: 'center' }, accountCopy: { flex: 1, marginLeft: spacing.md }, accountName: { color: colors.white, fontSize: 18, fontWeight: '900' }, workspace: { color: '#A7B7B1', fontSize: 14, marginTop: 3 }, divider: { height: 1, backgroundColor: '#17604B', marginVertical: spacing.xs }, row: { minHeight: 66, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm }, rowIcon: { color: colors.lime, fontSize: 25, width: 34, textAlign: 'center' }, rowCopy: { flex: 1, marginLeft: spacing.xs }, rowTitle: { color: colors.white, fontSize: 15, fontWeight: '900' }, rowSubtitle: { color: '#A7B7B1', fontSize: 12, marginTop: 3 }, chevron: { color: colors.lime, fontSize: 28, marginLeft: spacing.xs }, destructive: { color: '#FF8D8D' },
});
