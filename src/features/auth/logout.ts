import { router } from 'expo-router';
import type { QueryClient } from '@tanstack/react-query';
import { authApi } from '../../api/apiClient';
import { useAuthStore } from '../../store/authStore';

export async function performLogout(queryClient: QueryClient) {
  try { await authApi.logout(); } catch { /* local cleanup must still complete */ }
  await useAuthStore.getState().clearSession();
  await queryClient.cancelQueries();
  queryClient.clear();
  router.replace('/(auth)/login');
}
