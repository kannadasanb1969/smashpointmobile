import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AppProviders } from '../src/providers/AppProviders';
import { useAuthStore } from '../src/store/authStore';
import { LoadingScreen } from '../src/components/feedback/LoadingScreen';
import { startupDiagnostic } from '../src/utils/startupDiagnostics';
export default function Layout() {
  const restore = useAuthStore((s) => s.restoreSession);
  const ready = useAuthStore((s) => !s.isInitializing);
  const auth = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  const workspace = useAuthStore((s) => s.activeWorkspace);
  const segments = useSegments();
  const router = useRouter();
  useEffect(() => {
    startupDiagnostic('APP_BOOT');
    void restore();
  }, [restore]);
  useEffect(() => {
    if (!ready) return;
    startupDiagnostic('ROUTER_READY');
    const group = segments[0];
    const home =
      role === 'ADMIN'
        ? '/(admin)'
        : workspace === 'PLAYER'
          ? '/(player)'
          : workspace === 'ORGANIZER'
            ? '/(organizer)'
            : null;
    if (!group)
      router.replace(auth && home ? home : auth ? '/(auth)/choose-workspace' : '/(auth)/login');
    else if (auth && group === '(auth)' && home) router.replace(home);
    else if (!auth && ['(player)', '(organizer)', '(admin)'].includes(group as string))
      router.replace('/(auth)/login');
    else if (auth && group === '(admin)' && role !== 'ADMIN')
      router.replace(workspace === 'PLAYER' ? '/(player)' : '/(organizer)');
    else if (auth && group === '(player)' && workspace !== 'PLAYER')
      router.replace(workspace === 'ORGANIZER' ? '/(organizer)' : '/(auth)/choose-workspace');
    else if (auth && group === '(organizer)' && workspace !== 'ORGANIZER')
      router.replace(workspace === 'PLAYER' ? '/(player)' : '/(auth)/choose-workspace');
    startupDiagnostic('APP_READY');
  }, [ready, auth, role, workspace, segments, router]);
  return (
    <AppProviders>
      {ready ? <Stack screenOptions={{ headerShown: false }} /> : <LoadingScreen />}
    </AppProviders>
  );
}
