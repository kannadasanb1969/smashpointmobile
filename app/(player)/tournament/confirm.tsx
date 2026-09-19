import { Text, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { useAuthStore } from '../../../src/store/authStore';
import { useRegistration } from '../../../src/features/player/registration';
import { colors } from '../../../src/theme';
import { PrimaryButton } from '../../../src/components/common/PrimaryButton';
export default function Confirm() {
  const { id, categoryId, partnerId, partnerType, partnerName, tournamentName } =
    useLocalSearchParams<{
      id: string;
      categoryId: string;
      partnerId: string;
      partnerType: 'PLAYER' | 'GUEST';
      partnerName: string;
      tournamentName: string;
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
      <ScreenContainer>
        <Text style={s.success}>✓</Text>
        <Text style={s.title}>Registration Successful</Text>
        <Text style={s.center}>{tournamentName}</Text>
        <Text style={s.center}>Doubles · Partner: {partnerName}</Text>
        <PrimaryButton
          title="View My Registrations"
          onPress={() => router.replace('/(player)/registrations')}
        />
      </ScreenContainer>
    );
  return (
    <ScreenContainer>
      <Text onPress={() => router.back()} style={s.back}>
        ‹ Change Partner
      </Text>
      <Text style={s.title}>Confirm Registration</Text>
      <Text style={s.item}>Tournament: {tournamentName}</Text>
      <Text style={s.item}>Category: {categoryId}</Text>
      <Text style={s.item}>Player 1: You</Text>
      <Text style={s.item}>
        Player 2: {partnerName} ({partnerType || 'PLAYER'})
      </Text>
      <PrimaryButton
        title={m.isPending ? 'Submitting…' : 'Confirm Registration'}
        onPress={submit}
      />
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  back: { color: colors.primary, fontWeight: '700', marginTop: 25 },
  title: { fontSize: 29, fontWeight: '800', color: colors.text, marginVertical: 20 },
  item: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 14,
    marginBottom: 9,
    color: colors.text,
  },
  success: { fontSize: 64, color: colors.primary, textAlign: 'center', marginTop: 70 },
  center: { textAlign: 'center', color: colors.muted, fontSize: 17, marginBottom: 14 },
});
