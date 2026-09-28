import { Stack, useSegments } from 'expo-router';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { GlobalUserMenu } from '../../src/components/common/GlobalUserMenu';
import { useAuthStore } from '../../src/store/authStore';
import { authApi } from '../../src/api/apiClient';

export default function OrganizerLayout() {
  // useSegments() gives the route-group-aware path (e.g. ['(organizer)'] on Home, vs
  // ['(organizer)', 'tournament'] on Tournament Details) — segments.length <= 1 means no nested
  // screen segment is present, i.e. this is the Organizer Home route itself.
  const segments = useSegments();
  const onHome = segments.length <= 1;
  const user = useAuthStore((s) => s.user);
  const storedName = user?.displayName || user?.name || user?.fullName;
  // After a cold app restart, session restore only decodes {sub, role} from the access token
  // (see authStore.tokenUser) — the display name isn't in the store until the next fresh login.
  // Fetch it once via the existing GET /api/users/:id route, only when it's genuinely missing
  // and only while the avatar that needs it is actually visible.
  const profile = useQuery({
    queryKey: ['organizer-self-profile', user?.id],
    queryFn: () => authApi.getUser(user!.id),
    enabled: onHome && !storedName && !!user?.id,
    staleTime: Infinity,
  });
  const resolvedName = storedName || (profile.data as { displayName?: string } | undefined)?.displayName;
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      {onHome && <GlobalUserMenu displayName={resolvedName} />}
    </View>
  );
}
