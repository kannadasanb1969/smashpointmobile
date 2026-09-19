import { Text, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { useAuthStore } from '../../../src/store/authStore';
import { registrationApi, useRegistration } from '../../../src/features/player/registration';
import { colors } from '../../../src/theme';
import { PrimaryButton } from '../../../src/components/common/PrimaryButton';
export default function SinglesConfirm() {
  const { id, categoryId, tournamentName, categoryName } = useLocalSearchParams<{
    id: string;
    categoryId: string;
    tournamentName: string;
    categoryName: string;
  }>();
  const playerId = useAuthStore((s) => s.user?.playerProfile?.id) || '';
  const mutation = useRegistration();
  const [checking, setChecking] = useState(false);
  const [success, setSuccess] = useState(false);
  const submit = async () => {
    if (checking || mutation.isPending) return;
    if (!playerId)
      return Alert.alert('Profile required', 'Player profile is required before registration.');
    setChecking(true);
    try {
      const e = await registrationApi.eligibility({
        tournamentId: id,
        categoryId,
        playerId,
        partner: null,
      });
      if (!e.eligible)
        return Alert.alert('Not eligible', e.reasons.map((x) => x.message).join('\n'));
      mutation.mutate(
        { tournamentId: id, categoryId, playerId, partner: null },
        {
          onSuccess: () => setSuccess(true),
          onError: (x) =>
            Alert.alert(
              'Registration failed',
              x instanceof Error ? x.message : 'Please try again.',
            ),
        },
      );
    } catch (e) {
      Alert.alert('Eligibility check failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setChecking(false);
    }
  };
  if (success)
    return (
      <ScreenContainer>
        <Text style={s.success}>✓</Text>
        <Text style={s.title}>Registration Successful</Text>
        <Text style={s.center}>{tournamentName}</Text>
        <Text style={s.center}>Singles · {categoryName}</Text>
        <PrimaryButton
          title="View My Registrations"
          onPress={() => router.replace('/(player)/registrations')}
        />
      </ScreenContainer>
    );
  return (
    <ScreenContainer>
      <Text onPress={() => router.back()} style={s.back}>
        ‹ Change category
      </Text>
      <Text style={s.title}>Tournament Registration</Text>
      <Text style={s.step}>1 Event · 2 Details · 3 Confirm</Text>
      <Text style={s.item}>Tournament: {tournamentName}</Text>
      <Text style={s.item}>Category: {categoryName}</Text>
      <Text style={s.item}>Event: Singles</Text>
      <PrimaryButton
        title={checking || mutation.isPending ? 'Checking…' : 'Confirm Registration'}
        onPress={submit}
      />
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  back: { color: colors.primary, fontWeight: '700', marginTop: 25 },
  title: { fontSize: 29, fontWeight: '800', color: colors.text, marginVertical: 20 },
  step: { color: colors.primary, fontWeight: '700', marginBottom: 20 },
  item: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 14,
    marginBottom: 9,
    color: colors.text,
  },
  success: { fontSize: 64, color: colors.primary, textAlign: 'center', marginTop: 70 },
  center: { textAlign: 'center', color: colors.muted, fontSize: 17, marginBottom: 12 },
});
