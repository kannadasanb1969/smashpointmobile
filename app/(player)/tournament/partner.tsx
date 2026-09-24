import { Text, TextInput, Alert, ScrollView, FlatList, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { BackButton } from '../../../src/components/common/BackButton';
import { usePlayers } from '../../../src/features/player/api';
import { useAuthStore } from '../../../src/store/authStore';
import { registrationApi, type Partner as PartnerSelection } from '../../../src/features/player/registration';
import { resolvePlayerProfile } from '../../../src/features/player/profile';
import { validateGuestDob, guestDobMessage } from '../../../src/features/player/guestValidation';
import { colors } from '../../../src/theme';

export default function Partner() {
  const { id, categoryId, tournamentName, categoryName, eventType } = useLocalSearchParams<{
    id: string;
    categoryId: string;
    tournamentName?: string;
    categoryName?: string;
    eventType?: string;
  }>();
  const user = useAuthStore((state) => state.user);
  const players = usePlayers();
  const me = resolvePlayerProfile(players.data || [], user)?.id || '';
  const [mode, setMode] = useState<'PLAYER' | 'GUEST'>('PLAYER');
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [gender, setGender] = useState<'' | 'MALE' | 'FEMALE' | 'OTHER'>('');
  const [dob, setDob] = useState('');
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);
  const list = useMemo(
    () =>
      ((players.data || []) as any[]).filter(
        (p) =>
          String(p.id) !== String(me) &&
          (!search ||
            String(p.fullName).toLowerCase().includes(search.toLowerCase()) ||
            String(p.playerCode).toLowerCase().includes(search.toLowerCase())),
      ),
    [players.data, me, search],
  );
  const submit = async () => {
    if (busy) return;
    if (!me)
      return Alert.alert('Profile required', 'Player profile is required before registration.');
    let partner: PartnerSelection;
    let partnerName = '';
    if (mode === 'PLAYER') {
      if (!selected || String(selected.id) === String(me))
        return Alert.alert(
          'Invalid partner',
          'You cannot select yourself as your doubles partner.',
        );
      partner = { id: String(selected.id), type: 'PLAYER' };
      partnerName = selected.fullName;
    } else {
      if (!name.trim()) return Alert.alert('Check guest details', 'Name is required');
      if (!mobile.trim()) return Alert.alert('Check guest details', 'Mobile number is required');
      if (!gender) return Alert.alert('Check guest details', 'Gender is required');
      const dobError = validateGuestDob(dob);
      if (dobError)
        return Alert.alert('Check guest details', guestDobMessage(dobError) || 'Invalid date of birth');
      setBusy(true);
      try {
        const guest = await registrationApi.guest({
          fullName: name.trim(),
          mobile: mobile.trim(),
          gender,
          dob: dob.trim(),
          location: location.trim(),
          playingSince: new Date().getFullYear(),
          regularPlayer: false,
          courtAcademy: null,
        });
        partner = { id: String((guest as any).id), type: 'GUEST' };
        partnerName = name.trim();
      } catch (error) {
        Alert.alert(
          'Guest details unavailable',
          error instanceof Error ? error.message : 'Please try again.',
        );
        setBusy(false);
        return;
      }
    }
    setBusy(true);
    try {
      const eligibility = await registrationApi.eligibility({
        tournamentId: id,
        categoryId,
        playerId: me,
        partner,
      });
      if (!eligibility.eligible)
        return Alert.alert(
          'Partner not eligible',
          eligibility.reasons.map((reason) => reason.message).join('\n'),
        );
      router.push({
        pathname: '/(player)/tournament/confirm',
        params: {
          id,
          categoryId,
          partnerId: partner.id,
          partnerType: partner.type,
          partnerName,
          tournamentName: tournamentName || '',
          categoryName: categoryName || '',
          eventType: eventType || '',
        },
      });
    } catch (error) {
      Alert.alert(
        'Eligibility failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScreenContainer>
      <BackButton />
      <Text style={s.title}>Choose Your Partner</Text>
      <Text style={s.tabs}>
        <Text
          onPress={() => {
            setMode('PLAYER');
            setSelected(null);
          }}
          style={mode === 'PLAYER' ? s.active : undefined}
        >
          Existing Player
        </Text>
        <Text> </Text>
        <Text
          onPress={() => {
            setMode('GUEST');
            setSelected(null);
          }}
          style={mode === 'GUEST' ? s.active : undefined}
        >
          Guest Player
        </Text>
      </Text>
      {mode === 'PLAYER' ? (
        <>
          <TextInput
            accessibilityLabel="Search players"
            placeholder="Search players"
            value={search}
            onChangeText={setSearch}
            style={s.input}
          />
          <FlatList
            data={list}
            keyExtractor={(p) => String(p.id)}
            ListEmptyComponent={<Text style={s.empty}>No players found.</Text>}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setSelected(item)}
                style={[s.card, selected?.id === item.id && s.selected]}
              >
                <Text style={s.name}>{item.fullName}</Text>
                <Text style={s.meta}>
                  {item.playerCode} · {item.location || 'Location not provided'}
                </Text>
              </Pressable>
            )}
          />
        </>
      ) : (
        <ScrollView>
          <TextInput
            accessibilityLabel="Full Name"
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            style={s.input}
          />
          <TextInput
            accessibilityLabel="Mobile"
            placeholder="Mobile"
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            style={s.input}
          />
          <Text
            accessibilityLabel="Gender"
            onPress={() =>
              setGender((prev) => (prev === 'MALE' ? 'FEMALE' : prev === 'FEMALE' ? 'OTHER' : 'MALE'))
            }
            style={s.input}
          >
            {gender || 'Select gender'}
          </Text>
          <TextInput
            accessibilityLabel="Date of birth"
            placeholder="Date of birth (YYYY-MM-DD)"
            value={dob}
            onChangeText={setDob}
            style={s.input}
          />
          <TextInput
            accessibilityLabel="Location"
            placeholder="Location (optional)"
            value={location}
            onChangeText={setLocation}
            style={s.input}
          />
        </ScrollView>
      )}
      <Text onPress={submit} style={s.cta}>
        {busy ? 'Working…' : mode === 'PLAYER' ? 'Continue' : 'Create guest & continue'}
      </Text>
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginVertical: 18 },
  tabs: { color: colors.muted, marginBottom: 10 },
  active: { color: colors.primary, fontWeight: '800' },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 9,
  },
  card: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: { borderColor: colors.primary, borderWidth: 2 },
  name: { fontWeight: '800', fontSize: 17, color: colors.text },
  meta: { color: colors.muted, marginTop: 5 },
  empty: { color: colors.muted, textAlign: 'center', padding: 25 },
  cta: {
    backgroundColor: colors.primary,
    color: colors.white,
    padding: 16,
    borderRadius: 14,
    textAlign: 'center',
    fontWeight: '800',
    marginTop: 10,
  },
});
