import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { useAuthStore } from '../../../src/store/authStore';
import { useRegistration } from '../../../src/features/player/registration';
import { colors, radius, spacing } from '../../../src/theme';
import { PrimaryButton } from '../../../src/components/common/PrimaryButton';
import { BackButton } from '../../../src/components/common/BackButton';
import { TournamentIcon } from '../../../src/components/common/TournamentIcon';
import { RegistrationStepper } from '../../../src/components/registration/RegistrationStepper';

export default function Confirm() {
  const { id, categoryId, partnerId, partnerType, partnerName, tournamentName, categoryName, eventType } =
    useLocalSearchParams<{
      id: string;
      categoryId: string;
      partnerId: string;
      partnerType: 'PLAYER' | 'GUEST';
      partnerName: string;
      tournamentName?: string;
      categoryName?: string;
      eventType?: string;
    }>();
  const me = useAuthStore((s) => s.user?.playerProfile?.id) || '';
  const m = useRegistration();
  const [done, setDone] = useState(false);
  const submit = () => {
    if (m.isPending) return;
    if (!me)
      return Alert.alert('Profile required', 'Player profile is required before registration.');
    m.mutate(
      {
        tournamentId: id,
        categoryId,
        playerId: me,
        partner: { id: partnerId, type: partnerType || 'PLAYER' },
      },
      {
        onSuccess: () => setDone(true),
        onError: (e) =>
          Alert.alert('Registration failed', e instanceof Error ? e.message : 'Please try again.'),
      },
    );
  };
  if (done)
    return (
      <ScreenContainer dark>
        <View style={s.successBody}>
          <Text style={s.success}>✓</Text>
          <Text style={s.successTitle}>Registration Successful</Text>
          <Text style={s.successCenter}>{tournamentName}</Text>
          <Text style={s.successCenter}>Doubles · Partner: {partnerName}</Text>
          <PrimaryButton
            title="View My Registrations"
            onPress={() => router.replace('/(player)/registrations')}
          />
        </View>
      </ScreenContainer>
    );
  return (
    <ScreenContainer dark>
      <ScrollView contentContainerStyle={s.page} style={s.scroll} showsVerticalScrollIndicator={false}>
        <ImageBackground
          source={require('../../../assets/images/login-badminton-bg.png')}
          style={s.hero}
          imageStyle={s.heroImage}
        >
          <View style={s.heroOverlay} />
          <View style={s.heroTopRow}>
            <View style={s.heroCopy}>
              <BackButton variant="dark" style={s.back} />
              <Text style={s.brand}>
                Smash<Text style={s.lime}>Point</Text>
              </Text>
              <Text style={s.tagline}>Play. Compete. Belong.</Text>
            </View>
            <View style={s.moreBlock}>
              <Text style={s.moreText}>MORE</Text>
              <Text style={s.moreText}>THAN A</Text>
              <Text style={s.moreText}>GAME</Text>
            </View>
          </View>
          <View style={s.heroFade} />
        </ImageBackground>
        <View style={s.body}>
          <Text style={s.title}>Tournament Registration</Text>
          <View style={s.stepperWrap}>
            <RegistrationStepper currentStep={3} />
          </View>

          <View style={s.summaryPanel}>
            <Text style={s.summaryTitle}>Registration Summary</Text>
            <Text style={s.summarySubtitle}>Please review your details before confirming.</Text>

            <SummaryRow icon="trophy" label="TOURNAMENT" text={`Tournament: ${tournamentName || ''}`} />
            <SummaryRow icon="people" label="CATEGORY" text={`Category: ${categoryName || categoryId || ''}`} />
            <SummaryRow icon="shuttle" label="EVENT" text={`Event: ${eventType || 'Doubles'}`} />
            <SummaryRow icon="single" label="PLAYER 1" text="You" />
            <SummaryRow icon="single" label="PLAYER 2" text={`${partnerName || ''} (${partnerType || 'PLAYER'})`} />

            <Pressable
              disabled={m.isPending}
              onPress={submit}
              style={[s.confirmButton, m.isPending && s.disabled]}
            >
              <View style={s.confirmIcon}>
                <TournamentIcon name="check" size={14} />
              </View>
              <Text style={s.confirmText}>{m.isPending ? 'Submitting…' : 'Confirm Registration'}</Text>
            </Pressable>
            <View style={s.lockRow}>
              <TournamentIcon name="lock" size={14} />
              <Text style={s.lockText}>
                Your registration will be confirmed and you will receive a confirmation shortly.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function SummaryRow({ icon, label, text }: { icon: 'trophy' | 'people' | 'shuttle' | 'single'; label: string; text: string }) {
  return (
    <View style={s.row}>
      <View style={s.rowIcon}>
        <TournamentIcon name={icon} size={22} />
      </View>
      <View style={s.rowCopy}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowText}>{text}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { backgroundColor: '#031A16' },
  page: { paddingBottom: 60 },
  hero: { minHeight: 190, paddingTop: 8 },
  heroImage: { resizeMode: 'cover' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2, 27, 21, 0.62)' },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: -1, height: 26, backgroundColor: '#031A16' },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6 },
  heroCopy: { flexShrink: 1 },
  moreBlock: { alignItems: 'flex-end', paddingTop: 6 },
  moreText: { color: '#CFE0D8', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textAlign: 'right' },
  back: { marginBottom: spacing.sm },
  brand: { color: colors.white, fontSize: 26, fontWeight: '900', marginTop: 6 },
  lime: { color: colors.lime },
  tagline: { color: '#B7C9C1', fontSize: 12, marginTop: 3 },
  body: { paddingHorizontal: 20 },
  title: { color: colors.white, fontSize: 26, fontWeight: '900', marginTop: 16, marginBottom: 22 },
  stepperWrap: { marginBottom: 26 },
  summaryPanel: {
    backgroundColor: 'rgba(6, 45, 36, 0.9)',
    borderColor: '#17614B',
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  summaryTitle: { color: colors.white, fontSize: 19, fontWeight: '900' },
  summarySubtitle: { color: '#8FA59B', fontSize: 12, marginTop: 4, marginBottom: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#083127',
    borderColor: '#17614B',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(138, 226, 52, 0.14)',
    borderWidth: 1,
    borderColor: '#2E6C56',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowCopy: { flex: 1, minWidth: 0 },
  rowLabel: { color: colors.lime, fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  rowText: { color: colors.white, fontSize: 15, fontWeight: '800', marginTop: 3 },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 56,
    borderRadius: radius.medium,
    backgroundColor: colors.primary,
    marginTop: spacing.md,
    shadowColor: colors.lime,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  disabled: { opacity: 0.5 },
  confirmIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: { color: colors.white, fontSize: 16, fontWeight: '900' },
  lockRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: spacing.md },
  lockText: { flex: 1, color: '#8FA59B', fontSize: 11, lineHeight: 16 },
  successBody: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'center' },
  success: { fontSize: 64, color: colors.lime, textAlign: 'center', marginBottom: 12 },
  successTitle: { color: colors.white, fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  successCenter: { textAlign: 'center', color: '#A8B6B1', fontSize: 16, marginBottom: 10 },
});
