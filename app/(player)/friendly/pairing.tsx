import { Text, StyleSheet, ScrollView, RefreshControl, View, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../src/store/authStore';
import {
  friendlyApi,
  friendlyKeys,
  useFriendlyDetail,
  friendlyIsOwner,
  friendlyPairingReady,
  friendlyPairingLocked,
} from '../../../src/features/player/friendly';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { PrimaryButton } from '../../../src/components/common/PrimaryButton';
import { colors } from '../../../src/theme';
export default function Pairing() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    me = useAuthStore((s) => s.user?.playerProfile?.id) || '',
    d = useFriendlyDetail(id),
    c = useQueryClient(),
    p = useQuery({
      queryKey: friendlyKeys.participants(id),
      queryFn: () => friendlyApi.participants(id),
    }),
    t = useQuery({ queryKey: friendlyKeys.teams(id), queryFn: () => friendlyApi.teams(id) }),
    f = useQuery({
      queryKey: friendlyKeys.fixtures(id),
      queryFn: () => friendlyApi.fixtures(id),
      enabled: !!id,
    }),
    [sel, setSel] = useState<string[]>([]);
  const locked = friendlyPairingLocked(f.data),
    owner = friendlyIsOwner(d.data, me),
    mut = useMutation({
      mutationFn: (x: [string, string]) => friendlyApi.addTeam({ id, playerIds: x }),
      onSuccess: () => {
        setSel([]);
        void t.refetch();
        void c.invalidateQueries({ queryKey: friendlyKeys.detail(id) });
      },
    }),
    shuffle = useMutation({
      mutationFn: () => friendlyApi.shuffle(id),
      onSuccess: () => t.refetch(),
    }),
    unpair = useMutation({
      mutationFn: (teamId: string) => friendlyApi.deleteTeam({ id, teamId }),
      onSuccess: () => t.refetch(),
    });
  const paired = new Set(
      (t.data || []).flatMap((x: any) => x.members?.map((m: any) => m.id) || []),
    ),
    un = (p.data || []).filter((x: any) => !paired.has(x.player_id || x.id));
  if (!owner)
    return (
      <ScreenContainer>
        <Text style={s.title}>Pairing</Text>
        <Text>Pairing management is restricted to the creator.</Text>
      </ScreenContainer>
    );
  return (
    <ScreenContainer>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={p.isFetching || t.isFetching}
            onRefresh={() => {
              void p.refetch();
              void t.refetch();
            }}
          />
        }
      >
        <Text style={s.title}>{d.data?.title || 'Pairing'}</Text>
        <Text style={s.meta}>
          DOUBLES · {p.data?.length || 0} players · {(t.data || []).length} teams
        </Text>
        {locked ? (
          <Text style={s.lock}>Pairing Locked</Text>
        ) : (
          <>
            <Text style={s.heading}>Unpaired Players</Text>
            {un.map((x: any) => (
              <Text
                key={x.id || x.player_id}
                onPress={() =>
                  setSel((a) =>
                    a.includes(x.id || x.player_id)
                      ? a.filter((v) => v !== (x.id || x.player_id))
                      : a.length < 2
                        ? [...a, x.id || x.player_id]
                        : a,
                  )
                }
                style={[s.card, sel.includes(x.id || x.player_id) && s.selected]}
              >
                {x.full_name || x.name || 'Player details unavailable'}
              </Text>
            ))}
            <PrimaryButton
              disabled={sel.length !== 2 || mut.isPending}
              title={mut.isPending ? 'Creating…' : 'Create Pair'}
              onPress={() => {
                if (sel.length !== 2 || mut.isPending) return;
                Alert.alert('Create Pair?', 'Create a team with these players?', [
                  { text: 'Cancel' },
                  { text: 'Create', onPress: () => mut.mutate(sel as [string, string]) },
                ]);
              }}
            />
            <PrimaryButton
              disabled={shuffle.isPending}
              title={shuffle.isPending ? 'Shuffling…' : 'Shuffle Remaining'}
              onPress={() =>
                Alert.alert('Shuffle remaining?', 'Pair all remaining players?', [
                  { text: 'Cancel' },
                  { text: 'Shuffle', onPress: () => shuffle.mutate() },
                ])
              }
            />
            {(t.data || []).map((x: any) => (
              <View key={x.id} style={s.card}>
                <Text>Team {x.team_code || x.id}</Text>
                {(x.members || []).map((m: any) => (
                  <Text key={m.id}>{m.name || m.full_name || 'Player details unavailable'}</Text>
                ))}
                <PrimaryButton
                  disabled={unpair.isPending}
                  title="Unpair"
                  onPress={() =>
                    Alert.alert('Unpair team?', 'Remove this pair?', [
                      { text: 'Cancel' },
                      { text: 'Unpair', onPress: () => unpair.mutate(String(x.id)) },
                    ])
                  }
                />
              </View>
            ))}
          </>
        )}
        <PrimaryButton
          title="View Fixtures"
          onPress={() => router.push({ pathname: '/(player)/friendly/fixtures', params: { id } })}
        />
        <Text style={s.meta}>
          {friendlyPairingReady(d.data, p.data || [], t.data || [])
            ? 'Ready for Fixtures'
            : 'Pairing Incomplete'}
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '800', color: colors.text, marginTop: 35 },
  heading: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 20 },
  meta: { color: colors.muted, marginTop: 8 },
  card: {
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
    color: colors.text,
  },
  selected: { borderWidth: 2, borderColor: colors.primary },
  lock: { color: colors.error, fontWeight: '800', marginTop: 20 },
});
