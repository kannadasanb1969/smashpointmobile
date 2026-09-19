import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { authApi, normalizeAuthMobile } from '../../src/api/apiClient';
import { useAuthStore } from '../../src/store/authStore';
import { colors, radius, spacing } from '../../src/theme';

export default function Login() {
  const sessionMessage = useAuthStore((s) => s.sessionMessage);
  const [mobile, setMobile] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (mobile.length !== 10)
      return Alert.alert('Check your number', 'Enter a valid 10-digit mobile number');
    const normalizedMobile = normalizeAuthMobile(mobile);
    setBusy(true);
    try {
      await authApi.requestOtp(normalizedMobile);
      useAuthStore.setState({ sessionMessage: null });
      // Role must be chosen before verify-otp (the backend requires it on that call), so route to
      // the workspace picker first; it forwards the choice on to verify-otp.
      router.push({ pathname: '/(auth)/choose-workspace', params: { mobile: normalizedMobile } });
    } catch (e) {
      Alert.alert('Unable to send OTP', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ImageBackground
          source={require('../../assets/images/login-badminton-bg.png')}
          resizeMode="cover"
          style={s.hero}
        >
          <View style={s.overlay} />
          <View style={s.heroCopy}>
            <Text style={s.brand}>
              Smash<Text style={s.brandAccent}>Point</Text>
            </Text>
            <Text style={s.tagline}>PLAY • COMPETE • CONNECT</Text>
            <Text style={s.heroTitle}>
              Badminton{`\n`}
              <Text style={s.heroAccent}>Beyond</Text> Borders
            </Text>
            <Text style={s.heroSubtitle}>
              Tournaments. Friendly Matches.{`\n`}Players. Communities. All in one place.
            </Text>
          </View>
        </ImageBackground>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          bounces={false}
          contentContainerStyle={s.scroll}
        >
          <View style={s.card}>
            {sessionMessage && (
              <View style={s.sessionBanner}>
                <Text style={s.sessionBannerText}>{sessionMessage}</Text>
              </View>
            )}
            <Text style={s.cardTitle}>Get started</Text>
            <Text style={s.cardCopy}>Verify your mobile number to continue</Text>
            <Text style={s.label}>Mobile number</Text>
            <View style={s.phone}>
              <Text style={s.prefix}>+91</Text>
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
                placeholderTextColor={colors.muted}
                style={s.input}
              />
            </View>
            <PrimaryButton title={busy ? 'Sending…' : 'Send OTP  →'} onPress={submit} />
            <Text style={s.secure}>Sign in securely with your mobile number.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, marginHorizontal: -spacing.md },
  hero: { flex: 1.05, minHeight: 330, justifyContent: 'flex-end', overflow: 'hidden' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,40,25,.62)' },
  heroCopy: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  brand: { color: colors.white, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  brandAccent: { color: colors.lime },
  tagline: { color: '#D8EBDD', fontSize: 10, fontWeight: '900', letterSpacing: 1.3, marginTop: 5 },
  heroTitle: {
    color: colors.white,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '900',
    marginTop: spacing.xl,
  },
  heroAccent: { color: colors.lime },
  heroSubtitle: { color: '#D8EBDD', fontSize: 14, lineHeight: 21, marginTop: spacing.md },
  scroll: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -26,
    minHeight: 390,
  },
  card: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  sessionBanner: {
    backgroundColor: '#FDECEC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F3B8B8',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sessionBannerText: { color: colors.error, fontWeight: '700', fontSize: 13 },
  cardTitle: { fontSize: 24, fontWeight: '900', color: colors.text, textTransform: 'capitalize' },
  cardCopy: { fontSize: 14, color: colors.muted, marginTop: 5, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  phone: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  prefix: {
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
    padding: 16,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
  },
  input: {
    flex: 1,
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 16,
    fontSize: 17,
    color: colors.text,
  },
  secure: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: spacing.md },
});
