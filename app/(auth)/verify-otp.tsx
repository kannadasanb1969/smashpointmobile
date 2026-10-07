import { Alert, ImageBackground, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { BackButton } from '../../src/components/common/BackButton';
import { authApi, normalizeAuthMobile, normalizeAuthMobileDisplay } from '../../src/api/apiClient';
import { useAuthStore } from '../../src/store/authStore';
import { ownerHandoffErrorMessage, signInToOwnerApp } from '../../src/services/ownerHandoff';
import { OWNER_REDIRECT_NOTICE, workspaceParam as workspaceParamFn } from '../../src/utils/loginRoles';
import { colors, radius, spacing } from '../../src/theme';

export default function VerifyOtp() {
  const params = useLocalSearchParams<{ mobile?: string | string[]; workspace?: string | string[] }>();
  const mobile = Array.isArray(params.mobile) ? params.mobile[0] : params.mobile || '';
  const workspaceParam = Array.isArray(params.workspace) ? params.workspace[0] : params.workspace;
  const workspace = workspaceParamFn(workspaceParam);
  const isOwner = workspace === 'OWNER';
  const displayMobile = normalizeAuthMobileDisplay(mobile);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const setSession = useAuthStore((s) => s.setAccessSession);
  const setWorkspace = useAuthStore((s) => s.setWorkspace);
  const [wait, setWait] = useState(30);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const resend = async () => {
    try {
      await authApi.requestOtp(normalizeAuthMobile(displayMobile));
      setWait(30);
    } catch (e) {
      Alert.alert('Unable to resend OTP', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const verify = async () => {
    if (!/^\d{5}$/.test(otp)) return Alert.alert('Invalid code', 'Enter the 5-digit OTP.');
    setBusy(true);
    try {
      const normalizedMobile = normalizeAuthMobile(displayMobile);
      if (isOwner) {
        // Owner = same SmashPoint OTP login, then a one-time handoff to the separate Owner app. No SmashPoint session is kept.
        const outcome = await signInToOwnerApp(normalizedMobile, otp);
        router.replace(outcome === 'OPENED' ? '/(auth)/login' : '/(auth)/owner-app-missing');
        return;
      }
      const response = await authApi.verifyOtp(normalizedMobile, otp, workspace);
      const data = response.data as { accessToken: string; refreshToken: string; user: Parameters<typeof setSession>[2] };
      await setSession(data.accessToken, data.refreshToken, data.user);
      await setWorkspace(workspace);
      router.replace(
        workspace === 'PLAYER'
          ? '/(player)'
          : workspace === 'ORGANIZER'
            ? '/(organizer)'
            : '/(admin)',
      );
    } catch (e) {
      Alert.alert('Verification failed', isOwner ? ownerHandoffErrorMessage(e) : e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const boxes = Array.from({ length: 5 }, (_, index) => otp[index] || '');
  return (
    <ScreenContainer>
      <ImageBackground
        source={require('../../assets/images/login-badminton-bg.png')}
        resizeMode="cover"
        imageStyle={s.backgroundImage}
        style={s.page}
      >
        <View pointerEvents="none" style={s.tint} />
        <View pointerEvents="none" style={s.decor}>
          <View style={s.arcOne} />
          <View style={s.arcTwo} />
          <View style={s.shuttle}>
            <Text style={s.shuttleText}>⌁</Text>
          </View>
          <View style={s.dot} />
        </View>
        <BackButton fallbackRoute="/(auth)/login" style={s.back} />
        <Text style={s.brand}>
          Smash<Text style={s.brandAccent}>Point</Text>
        </Text>
        <Text style={s.tagline}>PLAY • COMPETE • CONNECT</Text>
        <View style={s.content}>
          <Text style={s.eyebrow}>{isOwner ? 'OWNER SELECTED' : 'SECURE SIGN IN'}</Text>
          <Text style={s.title}>{isOwner ? 'Welcome to SmashPoint' : 'Verify your number'}</Text>
          {isOwner ? (
            <View style={s.ownerNotice} accessibilityLabel="Owner selected">
              <View style={s.ownerIcon}>
                <Ionicons name="storefront" size={22} color={colors.white} />
              </View>
              <Text style={s.ownerNoticeText}>Owner selected. Enter OTP. {OWNER_REDIRECT_NOTICE}</Text>
            </View>
          ) : null}
          <Text style={s.copy}>We have sent a 5-digit OTP to</Text>
          <View style={s.numberRow}>
            <Text style={s.number}>+91 {displayMobile}</Text>
            <Text style={s.pencil}>✎</Text>
          </View>
          <View style={s.otpWrap}>
            <View style={s.boxRow} pointerEvents="none">
              {boxes.map((digit, index) => (
                <View
                  key={index}
                  style={[s.box, focused && index === Math.min(otp.length, 4) && s.boxFocused]}
                >
                  <Text style={s.digit}>{digit}</Text>
                </View>
              ))}
            </View>
            <TextInput
              accessibilityLabel="5-digit OTP"
              keyboardType="number-pad"
              maxLength={5}
              value={otp}
              onChangeText={setOtp}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={s.input}
              autoFocus
              caretHidden
            />
          </View>
          <Text style={s.hint}>Enter the code to continue</Text>
          {wait > 0 ? (
            <Text style={s.resend}>Resend OTP in 00:{String(wait).padStart(2, '0')}</Text>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="Resend OTP" onPress={() => void resend()}>
              <Text style={s.resend}>
                Didn’t receive the OTP? <Text style={s.resendAction}>Resend OTP</Text>
              </Text>
            </Pressable>
          )}
          <PrimaryButton title={busy ? (isOwner ? 'Opening Owner…' : 'Verifying…') : 'Verify OTP  →'} onPress={verify} disabled={busy} />
          <View style={s.security}>
            <View style={s.securityIcon}>
              <Text style={s.check}>✓</Text>
            </View>
            <View style={s.securityCopy}>
              <Text style={s.securityTitle}>Your number is safe with us</Text>
              <Text style={s.securityText}>
                We use secure authentication to keep your account protected.
              </Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, position: 'relative', paddingTop: spacing.sm },
  backgroundImage: { opacity: 0.12 },
  tint: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,255,255,.86)' },
  decor: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  arcOne: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    borderWidth: 18,
    borderColor: '#E7F3EA',
    opacity: 0.6,
    right: -145,
    top: 170,
  },
  arcTwo: {
    position: 'absolute',
    width: 205,
    height: 205,
    borderRadius: 103,
    borderWidth: 10,
    borderColor: '#F0F7E7',
    opacity: 0.8,
    left: -135,
    bottom: 95,
  },
  shuttle: {
    position: 'absolute',
    right: 36,
    top: 135,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F3E9',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.75,
    transform: [{ rotate: '-25deg' }],
  },
  shuttleText: { color: colors.primary, fontSize: 30, fontWeight: '900' },
  dot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.lime,
    opacity: 0.8,
    left: 32,
    top: 250,
  },
  back: { marginTop: spacing.sm, marginBottom: spacing.lg },
  brand: { color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  brandAccent: { color: colors.primary },
  tagline: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginTop: 4,
  },
  content: { marginTop: spacing.xl },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  title: {
    color: colors.text,
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
  copy: { color: colors.muted, fontSize: 16, marginTop: spacing.md },
  numberRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, marginBottom: spacing.xl },
  number: { color: colors.primary, fontSize: 18, fontWeight: '900' },
  pencil: { color: colors.primary, fontSize: 17, marginLeft: 8 },
  otpWrap: { height: 72, position: 'relative' },
  boxRow: { flexDirection: 'row', gap: 8, height: 72 },
  box: {
    flex: 1,
    height: 68,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFocused: { borderColor: colors.primary, borderWidth: 2, backgroundColor: '#F3FAF4' },
  digit: { color: colors.text, fontSize: 25, fontWeight: '900' },
  input: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
    color: 'transparent',
    backgroundColor: 'transparent',
    opacity: 0.02,
    fontSize: 1,
  },
  hint: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 8 },
  ownerNotice: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF4E0', borderColor: '#F3D9A4', borderWidth: 1, borderRadius: 14, padding: 12, marginTop: spacing.md },
  ownerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  ownerNoticeText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.text },
  resend: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 13,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  resendAction: { color: colors.primary, fontWeight: '900' },
  security: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F1',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: '#DCEEDF',
  },
  securityIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#D7F0DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  check: { color: colors.success, fontWeight: '900', fontSize: 18 },
  securityCopy: { flex: 1 },
  securityTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  securityText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
});
