import { Alert, ImageBackground, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { TournamentIcon } from '../../src/components/common/TournamentIcon';
import { authApi, normalizeAuthMobile } from '../../src/api/apiClient';
import { useAuthStore } from '../../src/store/authStore';
import { colors, radius, spacing } from '../../src/theme';

const features = [
  { label: 'Tournaments', icon: 'trophy' as const },
  { label: 'Friendly\nMatches', icon: 'people' as const },
  { label: 'Players', icon: 'single' as const },
  { label: 'Community', icon: 'people' as const },
];

export default function Login() {
  const sessionMessage = useAuthStore((s) => s.sessionMessage);
  const [mobile, setMobile] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (mobile.length !== 10) return Alert.alert('Check your number', 'Enter a valid 10-digit mobile number');
    const normalizedMobile = normalizeAuthMobile(mobile);
    setBusy(true);
    try {
      await authApi.requestOtp(normalizedMobile);
      useAuthStore.setState({ sessionMessage: null });
      router.push({ pathname: '/(auth)/choose-workspace', params: { mobile: normalizedMobile } });
    } catch (e) {
      Alert.alert('Unable to send OTP', e instanceof Error ? e.message : 'Please try again.');
    } finally { setBusy(false); }
  };
  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ImageBackground source={require('../../assets/images/login-badminton-bg.png')} resizeMode="cover" style={s.background}>
          <View style={s.overlay} />
          <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={s.topRow}>
              <View>
                <View style={s.logoRow}><Ionicons name="tennisball-outline" size={34} color={colors.white} /><Text style={s.brand}>Smash<Text style={s.brandAccent}>Point</Text></Text></View>
                <Text style={s.tagline}>PLAY · COMPETE · CONNECT</Text>
              </View>
              <View style={s.badge}><Text style={s.badgeText}>Play{`\n`}Badminton{`\n`}Stay Healthy</Text><Ionicons name="leaf-outline" size={27} color={colors.lime} /></View>
            </View>
            <View style={s.heroCopy}>
              <Text style={s.kicker}>MORE THAN A GAME</Text>
              <Text style={s.heroTitle}>Badminton</Text><Text style={s.heroTitleAccent}>Beyond</Text><Text style={s.heroTitle}>Borders</Text>
              <View style={s.divider} /><Text style={s.heroSubtitle}>Tournaments. Friendly Matches.{`\n`}Players. Communities.{`\n`}All in one place.</Text>
            </View>
            <View style={s.featureRow}>{features.map((feature) => <View key={feature.label} style={s.feature}><View style={s.featureIcon}><TournamentIcon name={feature.icon} size={31} /></View><Text style={s.featureLabel}>{feature.label}</Text></View>)}</View>
            <View style={s.card}>
              {sessionMessage && <View style={s.sessionBanner}><Text style={s.sessionBannerText}>{sessionMessage}</Text></View>}
              <Text style={s.cardTitle}>Get Started</Text><Text style={s.cardCopy}>Enter your mobile number to continue</Text>
              <View style={s.phone}>
                <View style={s.country}><Text style={s.flag}>🇮🇳</Text><Text style={s.prefix}>+91</Text><Ionicons name="chevron-down" size={18} color={colors.dark} /></View>
                <TextInput accessibilityLabel="Mobile number" keyboardType="number-pad" maxLength={10} value={mobile} onChangeText={(text) => { const hasIndiaCode = /^\s*(?:\+91|0091)\b/.test(text); let digitsOnly = text.replace(/\D/g, ''); if (hasIndiaCode) digitsOnly = digitsOnly.slice(2); setMobile(digitsOnly.slice(0, 10)); }} placeholder="10-digit mobile number" placeholderTextColor="#80908F" style={s.input} />
              </View>
              <Pressable disabled={busy} onPress={submit} style={[s.cta, busy && s.ctaDisabled]}><Text style={s.ctaText}>{busy ? 'Sending…' : 'Send OTP  →'}</Text></Pressable>
              <View style={s.secureRow}><Ionicons name="shield-checkmark" size={22} color={colors.dark} /><Text style={s.secure}>Sign in securely with your mobile number.</Text></View>
            </View>
            <View style={s.footer}><View style={s.gameOnRow}><View style={s.footerLine} /><Text style={s.gameOn}>GAME ON</Text><View style={s.footerLine} /></View><Text style={s.footerCopy}>PEOPLE · PASSION · PROGRESS</Text></View>
          </ScrollView>
        </ImageBackground>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, marginHorizontal: -spacing.md }, background: { flex: 1 }, overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 43, 30, 0.68)' }, content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, brand: { color: colors.white, fontSize: 31, fontWeight: '900', letterSpacing: -1.2 }, brandAccent: { color: colors.lime }, tagline: { color: '#E4F0EA', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: 3, marginLeft: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(10, 121, 75, .55)', borderColor: 'rgba(138,226,52,.65)', borderWidth: 1.5, borderRadius: 22, paddingHorizontal: 11, paddingVertical: 8 }, badgeText: { color: colors.white, fontSize: 11, lineHeight: 14, fontWeight: '800' }, heroCopy: { marginTop: 27 }, kicker: { color: colors.lime, fontSize: 13, fontWeight: '900', letterSpacing: 3, marginBottom: 9 }, heroTitle: { color: colors.white, fontSize: 39, lineHeight: 40, fontWeight: '900', letterSpacing: -1.2 }, heroTitleAccent: { color: colors.lime, fontSize: 39, lineHeight: 40, fontWeight: '900', letterSpacing: -1.2 }, divider: { width: 58, height: 3, backgroundColor: colors.lime, marginTop: 17, marginBottom: 18 }, heroSubtitle: { color: '#E2EEE8', fontSize: 15, lineHeight: 22, fontWeight: '500' },
  featureRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22, marginBottom: 17 }, feature: { alignItems: 'center', width: '24%' }, featureIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(31, 143, 96, .42)', borderWidth: 2, borderColor: 'rgba(138,226,52,.28)' }, featureLabel: { color: colors.white, fontSize: 12, lineHeight: 14, textAlign: 'center', marginTop: 7, fontWeight: '700' },
  card: { backgroundColor: '#FEFFFE', borderRadius: 28, padding: 20, shadowColor: colors.lime, shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 8 }, sessionBanner: { backgroundColor: '#FDECEC', borderRadius: radius.md, borderWidth: 1, borderColor: '#F3B8B8', padding: spacing.md, marginBottom: spacing.md }, sessionBannerText: { color: colors.error, fontWeight: '700', fontSize: 13 }, cardTitle: { fontSize: 26, fontWeight: '900', color: colors.text }, cardCopy: { fontSize: 15, color: '#80908F', marginTop: 6, marginBottom: 17 },
  phone: { flexDirection: 'row', alignItems: 'stretch', height: 58, borderWidth: 1.5, borderColor: '#D5E0DD', borderRadius: 20, overflow: 'hidden', backgroundColor: '#FCFEFD' }, country: { width: 104, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRightWidth: 1.5, borderRightColor: '#D5E0DD' }, flag: { fontSize: 20 }, prefix: { color: colors.text, fontSize: 17, fontWeight: '800' }, input: { flex: 1, paddingHorizontal: 14, fontSize: 16, color: colors.text }, cta: { marginTop: 16, minHeight: 56, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primaryDark, shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 5 }, elevation: 4 }, ctaDisabled: { backgroundColor: colors.disabled, shadowOpacity: 0 }, ctaText: { color: colors.white, fontSize: 18, fontWeight: '900' }, secureRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: 16 }, secure: { color: '#80908F', fontSize: 12, fontWeight: '600' },
  footer: { alignItems: 'center', paddingTop: 24 }, gameOnRow: { flexDirection: 'row', alignItems: 'center', gap: 14 }, footerLine: { width: 44, height: 2, backgroundColor: colors.lime }, gameOn: { color: colors.lime, fontSize: 16, fontWeight: '900', letterSpacing: 4 }, footerCopy: { color: '#D5E8DE', fontSize: 10, fontWeight: '800', letterSpacing: 2.5, marginTop: 10 },
});
