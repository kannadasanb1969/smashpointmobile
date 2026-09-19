import { Stack } from 'expo-router';
import { View } from 'react-native';
import { useEffect } from 'react';
import { useAuthStore } from '../../src/store/authStore';
import { usePlayers } from '../../src/features/player/api';
import { resolvePlayerProfile } from '../../src/features/player/profile';
import { LoadingScreen } from '../../src/components/feedback/LoadingScreen';
import { GlobalUserMenu } from '../../src/components/common/GlobalUserMenu';

export default function PlayerLayout() {
  const user = useAuthStore((state) => state.user);
  const query = usePlayers();
  const profile = resolvePlayerProfile(query.data ?? [], user);
  useEffect(() => {
    if (!profile || !user || user.playerProfile?.id === profile.id) return;
    useAuthStore.setState({
      user: { ...user, playerProfile: { id: profile.id, playerCode: profile.playerCode } },
    });
  }, [profile, user]);
  if (query.isLoading) return <LoadingScreen />;
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      <GlobalUserMenu />
    </View>
  );
}
