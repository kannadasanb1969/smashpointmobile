import { Stack } from 'expo-router';
import { View } from 'react-native';
import { GlobalUserMenu } from '../../src/components/common/GlobalUserMenu';
export default function AdminLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      <GlobalUserMenu />
    </View>
  );
}
