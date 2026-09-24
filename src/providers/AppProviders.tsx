import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import type { PropsWithChildren } from 'react';
import { useAuthStore } from '../store/authStore';
export const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000, refetchOnWindowFocus: false } },
});
export function AppProviders({ children }: PropsWithChildren) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const wasAuthenticated = useRef(isAuthenticated);
  useEffect(() => {
    const transitionedToLoggedOut = wasAuthenticated.current && !isAuthenticated;
    wasAuthenticated.current = isAuthenticated;
    if (!transitionedToLoggedOut) return;
    let cancelled = false;
    void client.cancelQueries().then(() => {
      if (!cancelled && !useAuthStore.getState().isAuthenticated) client.clear();
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </SafeAreaProvider>
  );
}
