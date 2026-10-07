import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { colors, radius, spacing } from '../../src/theme';
import { OWNER_ANDROID_STORE_URL, OWNER_IOS_STORE_URL } from '../../src/config/ownerApp';

// Shown when smashpointowner:// has no app to open it. Store buttons appear ONLY when real URLs are configured in
// src/config/ownerApp.ts; nothing is invented.
export default function OwnerAppMissing() {
  type Store = { key: string; label: string; icon: 'logo-google-playstore' | 'logo-apple-appstore'; url: string };
  const stores: Store[] = [];
  const androidUrl: string = OWNER_ANDROID_STORE_URL;
  const iosUrl: string = OWNER_IOS_STORE_URL;
  if (androidUrl) stores.push({ key: 'android', label: 'Get it on Google Play', icon: 'logo-google-playstore', url: androidUrl });
  if (iosUrl) stores.push({ key: 'ios', label: 'Download on the App Store', icon: 'logo-apple-appstore', url: iosUrl });
  const open = (url: string) => Linking.openURL(url).catch(() => Alert.alert('Unable to open the store', Platform.OS === 'ios' ? 'Please open the App Store and search for SmashPoint Owner.' : 'Please open Google Play and search for SmashPoint Owner.'));
  const stay = () => router.replace('/(auth)/login');
  return (
    <ScreenContainer>
      <View style={s.page}>
        <View style={s.icon}>
          <Ionicons name="storefront" size={44} color={colors.white} />
          <Text style={s.iconLabel}>OWNER</Text>
        </View>
        <Text style={s.title}>SmashPoint Owner{`\n`}App Not Installed</Text>
        <Text style={s.copy}>
          {stores.length ? 'Please install the SmashPoint Owner app to manage your badminton academy.' : 'SmashPoint Owner app is not installed.'}
        </Text>
        {stores.map((store) => (
          <Pressable key={store.key} accessibilityRole="button" accessibilityLabel={store.label} onPress={() => open(store.url)} style={s.store}>
            <Ionicons name={store.icon} size={22} color={colors.white} />
            <Text style={s.storeText}>{store.label}</Text>
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" accessibilityLabel="Stay in SmashPoint" onPress={stay} style={s.stay}>
          <Text style={s.stayText}>Stay in SmashPoint</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.md },
  icon: { alignSelf: 'center', width: 92, height: 92, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  iconLabel: { color: colors.white, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 2 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '900', color: colors.text, textAlign: 'center' },
  copy: { fontSize: 15, lineHeight: 22, color: colors.secondary, textAlign: 'center', marginBottom: spacing.sm },
  store: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 54, borderRadius: radius.md, backgroundColor: colors.primary },
  storeText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  stay: { minHeight: 54, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  stayText: { color: colors.text, fontSize: 16, fontWeight: '800' },
});
