import { Text, StyleSheet, View, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { useAuthStore } from '../../src/store/authStore';
import { usePlayers } from '../../src/features/player/api';
import { resolvePlayerProfile } from '../../src/features/player/profile';
import { QueryState } from '../../src/components/feedback/QueryState';
import { colors } from '../../src/theme';
import { AppHeader } from '../../src/components/common/AppHeader';
import { SportsCard } from '../../src/components/common/SportsCard';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { BottomNav } from '../../src/components/common/BottomNav';
export default function Profile() {
  const user = useAuthStore((state) => state.user);
  const query = usePlayers();
  const profile = resolvePlayerProfile(query.data ?? [], user);
  useEffect(() => {
    if (!profile || !user) return;
    // Guard against re-triggering: setState below creates a new `user` object every time, and
    // `user` is a dependency of this effect, so without this check it would set state -> re-render
    // -> new user reference -> effect fires again -> infinite loop (froze the app once a profile
    // actually existed, since this previously never ran past the `!profile` early return).
    if (
      user.playerProfile?.id === profile.id &&
      user.playerProfile?.playerCode === profile.playerCode
    )
      return;
    useAuthStore.setState({
      user: { ...user, playerProfile: { id: profile.id, playerCode: profile.playerCode } },
    });
  }, [profile, user]);
  return (
    <ScreenContainer>
      <ScrollView>
        <AppHeader title="My profile" eyebrow="SMASHPOINT · PLAYER" />
        <QueryState
          loading={query.isLoading}
          error={query.isError}
          onRetry={() => query.refetch()}
        />
        {!query.isLoading && !query.isError && !profile && (
          <>
            <Text style={s.empty}>You haven't created a player profile yet.</Text>
            <PrimaryButton
              title="Create profile"
              onPress={() => router.push('/(player)/profile-edit')}
            />
          </>
        )}
        {profile && (
          <>
            <SportsCard accent>
              <Text style={s.avatar}>
                {String(profile.fullName || 'P')
                  .slice(0, 1)
                  .toUpperCase()}
              </Text>
              <Text style={s.name}>{profile.fullName}</Text>
              <Text style={s.code}>{profile.playerCode}</Text>
              <Text style={s.location}>⌖ {profile.location || 'Location not provided'}</Text>
            </SportsCard>
            <Text style={s.section}>Player details</Text>
            <View style={s.grid}>
              {[
                ['Gender', profile.gender],
                ['Playing since', profile.playingSince],
                ['Court / academy', profile.courtAcademy],
              ].map(([key, value]) => (
                <View style={s.item} key={key}>
                  <Text style={s.itemLabel}>{key}</Text>
                  <Text style={s.itemValue}>{value || 'Not provided'}</Text>
                </View>
              ))}
            </View>
            <PrimaryButton
              title="Edit profile"
              onPress={() => router.push('/(player)/profile-edit')}
            />
            <View style={s.linkRow}>
              <View style={s.linkItem}>
                <PrimaryButton title="Medal History" onPress={() => router.push('/(player)/medals')} />
              </View>
              <View style={s.linkItem}>
                <PrimaryButton title="My Results" onPress={() => router.push('/(player)/results')} />
              </View>
            </View>
          </>
        )}
      </ScrollView>
      <BottomNav active="Profile" />
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  empty: { color: colors.muted, fontSize: 15, marginTop: 24, marginBottom: 16 },
  name: { fontSize: 25, fontWeight: '900', color: colors.white, marginTop: 12 },
  code: { color: colors.lime, fontWeight: '800', marginTop: 5 },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.lime,
    color: colors.primaryDark,
    textAlign: 'center',
    paddingTop: 12,
    fontSize: 24,
    fontWeight: '900',
  },
  location: { color: '#C8DED1', marginTop: 12 },
  section: { fontSize: 19, fontWeight: '900', color: colors.text, marginTop: 28, marginBottom: 12 },
  linkRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  linkItem: { flex: 1 },
  grid: { gap: 10 },
  item: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  itemValue: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 5 },
});
