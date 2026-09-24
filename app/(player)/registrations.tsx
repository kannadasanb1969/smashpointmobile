import { FlatList, Text, StyleSheet, View, Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { BackButton } from '../../src/components/common/BackButton';
import { useAuthStore } from '../../src/store/authStore';
import {
  useRegistrations,
  usePlayers,
  useGuests,
  useTournament,
  playerKeys,
} from '../../src/features/player/api';
import { registrationApi } from '../../src/features/player/registration';
import { QueryState } from '../../src/components/feedback/QueryState';
import { colors } from '../../src/theme';
type Row = {
  id: string;
  registrationCode: string;
  tournamentId: string;
  eventType: 'SINGLES' | 'DOUBLES';
  status: string;
  partnerId?: string | null;
  partnerType?: 'PLAYER' | 'GUEST' | null;
};
const CANCELLABLE = ['PENDING', 'REGISTERED', 'CONFIRMED'];
function Card({ item, playerId }: { item: Row; playerId: string }) {
  const t = useTournament(item.tournamentId);
  const players = usePlayers();
  const guests = useGuests();
  const client = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => registrationApi.cancel(String(item.id)),
    onSuccess: () => client.invalidateQueries({ queryKey: playerKeys.registrations(playerId) }),
    onError: (e: any) =>
      Alert.alert(
        'Unable to cancel',
        e?.message || 'Please try again.',
      ),
  });
  const partner = item.partnerId
    ? item.partnerType === 'GUEST'
      ? guests.data?.find((x: any) => String(x.id) === String(item.partnerId))
      : players.data?.find((x: any) => String(x.id) === String(item.partnerId))
    : null;
  return (
    <View style={s.card}>
      <Text style={s.name}>{t.data?.name || 'Tournament details unavailable'}</Text>
      <Text style={s.meta}>
        {item.eventType} · {item.registrationCode}
      </Text>
      {item.eventType === 'DOUBLES' && (
        <Text style={s.partner}>Partner: {partner?.fullName || 'Partner details unavailable'}</Text>
      )}
      <Text style={s.status}>{item.status}</Text>
      {CANCELLABLE.includes(item.status) && (
        <Text
          style={s.cancel}
          onPress={() => {
            if (cancel.isPending) return;
            Alert.alert(
              'Cancel registration',
              'Are you sure you want to cancel this registration?',
              [
                { text: 'Keep registration', style: 'cancel' },
                { text: 'Cancel registration', style: 'destructive', onPress: () => cancel.mutate() },
              ],
            );
          }}
        >
          {cancel.isPending ? 'Cancelling…' : 'Cancel registration'}
        </Text>
      )}
    </View>
  );
}
export default function Registrations() {
  const id = useAuthStore((s) => s.user?.playerProfile?.id) || '';
  const q = useRegistrations(id);
  return (
    <ScreenContainer>
      <BackButton fallbackRoute="/(player)/" />
      <Text style={s.title}>My registrations</Text>
      <QueryState
        loading={q.isLoading}
        error={q.isError}
        empty={!q.isLoading && !q.isError && !q.data?.length}
        onRetry={() => q.refetch()}
      />
      <FlatList
        data={q.data || []}
        keyExtractor={(x: Row) => String(x.id)}
        renderItem={({ item }) => <Card item={item as Row} playerId={id} />}
      />
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '800', color: colors.text, marginTop: 35, marginBottom: 16 },
  card: { backgroundColor: colors.white, padding: 18, borderRadius: 16, marginBottom: 10 },
  name: { fontSize: 17, fontWeight: '800', color: colors.text },
  meta: { color: colors.muted, marginTop: 7 },
  partner: { color: colors.text, marginTop: 10, fontWeight: '600' },
  status: { color: colors.primary, fontWeight: '800', marginTop: 10 },
  cancel: { color: colors.error, fontWeight: '800', marginTop: 12 },
});
