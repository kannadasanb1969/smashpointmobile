import { Alert, ImageBackground, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { authApi, normalizeAuthMobile, normalizeAuthMobileDisplay } from '../../src/api/apiClient';
import { useAuthStore } from '../../src/store/authStore';
import { colors, radius, spacing } from '../../src/theme';
import { LOGIN_ROLES, OWNER_REDIRECT_NOTICE, routeAfterOtpRequest, type LoginRole } from '../../src/utils/loginRoles';

const ICON: Record<LoginRole, 'person' | 'people' | 'storefront'> = { PLAYER: 'person', ORGANIZER: 'people', OWNER: 'storefront' };

export default function Login() {
  const sessionMessage = useAuthStore((s) => s.sessionMessage);
  const [role, setRole] = useState<LoginRole>('PLAYER');
  const [mobile, setMobile] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (mobile.length !== 10) return Alert.alert('Check your number', 'Enter a valid 10-digit mobile number');
    const normalizedMobile = normalizeAuthMobile(mobile);
    setBusy(true);
    try {
      await authApi.requestOtp(normalizedMobile);
      useAuthStore.setState({ sessionMessage: null });
      router.push(routeAfterOtpRequest(role, normalizeAuthMobileDisplay(normalizedMobile), normalizedMobile));
    } catch (e) {
      Alert.alert('Unable to send OTP', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const owner = role === 'OWNER';
  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ImageBackground source={require('../../assets/images/login-badminton-bg.png')} resizeMode="cover" imageStyle={s.bgImage} style={s.background}>
          <View pointerEvents="none" style={s.tint} />
          <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {sessionMessage ? (
              <View style={s.sessionBanner}>
                <Text style={s.sessionBannerText}>{sessionMessage}</Text>
              </View>
            ) : null}
            <Text style={s.title}>Welcome to{`\n`}SmashPoint</Text>
            <Text style={s.subtitle}>Choose how you want to continue</Text>

            <View style={s.roles}>
              {LOGIN_ROLES.map((r) => {
                const selected = r.key === role;
                const solid = selected && r.key === 'OWNER'; // Owner selected = strong green card
                return (
                  <Pressable
                    key={r.key}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${r.title}`}
                    accessibilityState={{ selected }}
                    onPress={() => setRole(r.key)}
                    style={[s.roleCard, selected && { borderColor: solid ? colors.primary : r.accent, borderWidth: 2, backgroundColor: solid ? colors.primary : r.tint }]}
                  >
                    <View style={[s.roleIcon, { backgroundColor: solid ? 'rgba(255,255,255,0.22)' : r.tint }]}>
                      <Ionicons name={ICON[r.key]} size={24} color={solid ? colors.white : r.accent} />
                    </View>
                    <Text style={[s.roleTitle, solid && s.onGreen]}>{r.title}</Text>
                    <Text style={[s.roleCopy, solid && s.onGreenMuted]}>{r.copy}</Text>
                  </Pressable>
                );
              })}
            </View>

            {owner ? (
              <View style={s.notice} accessibilityLabel="Owner redirect notice">
                <Ionicons name="information-circle" size={22} color="#E8890C" />
                <Text style={s.noticeText}>{OWNER_REDIRECT_NOTICE}</Text>
              </View>
            ) : null}

            <Text style={s.label}>Enter your mobile number</Text>
            <View style={s.phone}>
              <View style={s.country}>
                <Text style={s.prefix}>+91</Text>
                <Ionicons name="chevron-down" size={16} color={colors.dark} />
              </View>
              <TextInput
                accessibilityLabel="Mobile number"
                keyboardType="number-pad"
                maxLength={10}
                value={mobile}
                onChangeText={(text) => {
                  const hasIndiaCode = /^\s*(?:\+91|0091)\b/.test(text);
                  let digitsOnly = text.replace(/\D/g, '');
                  if (hasIndiaCode) digitsOnly = digitsOnly.slice(2);
                  setMobile(digitsOnly.slice(0, 10));
                }}
                placeholder="10-digit mobile number"
                placeholderTextColor="#80908F"
                style={s.input}
              />
            </View>
            <Pressable disabled={busy} accessibilityRole="button" onPress={submit} style={[s.cta, busy && s.ctaDisabled]}>
              <Text style={s.ctaText}>{busy ? 'Sending…' : 'Send OTP'}</Text>
            </Pressable>

            {owner ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Back to previous screen" onPress={() => setRole('PLAYER')} style={s.backLink}>
                <Ionicons name="arrow-back" size={16} color={colors.primary} />
                <Text style={s.backText}>Back to previous screen</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </ImageBackground>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, marginHorizontal: -spacing.md },
  background: { flex: 1, backgroundColor: '#F4FAF6' },
  bgImage: { opacity: 0.1 },
  tint: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(244,250,246,0.9)' },
  content: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 28 },
  sessionBanner: { backgroundColor: '#FDECEC', borderRadius: radius.md, borderWidth: 1, borderColor: '#F3B8B8', padding: spacing.md, marginBottom: spacing.md },
  sessionBannerText: { color: colors.error, fontWeight: '700', fontSize: 13 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '900', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 15, color: colors.secondary, textAlign: 'center', marginTop: 8, marginBottom: 22 },
  roles: { flexDirection: 'row', gap: 10 },
  roleCard: { flex: 1, alignItems: 'center', backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingVertical: 14, paddingHorizontal: 6, minHeight: 148, shadowColor: '#12352A', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  roleIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  roleTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  roleCopy: { fontSize: 11, lineHeight: 15, color: colors.secondary, textAlign: 'center', marginTop: 4 },
  onGreen: { color: colors.white },
  onGreenMuted: { color: 'rgba(255,255,255,0.85)' },
  notice: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#FFF4E0', borderColor: '#F3D9A4', borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 16 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.text },
  label: { fontSize: 14, color: colors.secondary, fontWeight: '600', marginTop: 22, marginBottom: 8 },
  phone: { flexDirection: 'row', alignItems: 'stretch', height: 56, borderWidth: 1.5, borderColor: '#D5E0DD', borderRadius: 14, overflow: 'hidden', backgroundColor: colors.white },
  country: { width: 92, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRightWidth: 1.5, borderRightColor: '#D5E0DD' },
  prefix: { color: colors.text, fontSize: 16, fontWeight: '800' },
  input: { flex: 1, paddingHorizontal: 14, fontSize: 16, color: colors.text },
  cta: { marginTop: 16, minHeight: 54, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primaryDark, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  ctaDisabled: { backgroundColor: colors.disabled, shadowOpacity: 0 },
  ctaText: { color: colors.white, fontSize: 17, fontWeight: '800' },
  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18, padding: 6 },
  backText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
