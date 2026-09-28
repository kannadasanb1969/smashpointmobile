import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { BackButton } from '../../src/components/common/BackButton';
import { BottomNav } from '../../src/components/common/BottomNav';
import { useAuthStore } from '../../src/store/authStore';
import { useActiveRegistrations, usePlayers, useGuests, useRegistrations, useTournament, playerKeys } from '../../src/features/player/api';
import { registrationApi } from '../../src/features/player/registration';
import { registrationFeeLabel } from '../../src/features/organizer/prize';
import { TournamentIcon } from '../../src/components/common/TournamentIcon';
import { colors } from '../../src/theme';

type Row = { id: string; tournamentId: string; categoryId?: string; eventType: 'SINGLES' | 'DOUBLES'; status: string; partnerId?: string | null; partnerType?: 'PLAYER' | 'GUEST' | null };
const CANCELLABLE = ['PENDING', 'REGISTERED', 'CONFIRMED'];

function EntryCard({ item, playerId }: { item: Row; playerId: string }) {
  const tournament = useTournament(String(item.tournamentId));
  const players = usePlayers();
  const guests = useGuests();
  const client = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => registrationApi.cancel(String(item.id)),
    onSuccess: () => client.invalidateQueries({ queryKey: playerKeys.registrations(playerId) }),
  });
  const t = tournament.data;
  const category = t?.categories?.find((x: any) => String(x.id) === String(item.categoryId));
  const partner = item.partnerId
    ? item.partnerType === 'GUEST'
      ? guests.data?.find((x: any) => String(x.id) === String(item.partnerId))
      : players.data?.find((x: any) => String(x.id) === String(item.partnerId))
    : null;
  const date = t?.startDate || t?.tournamentDate;
  const venue = t?.venue || t?.venueName || t?.location || 'Venue TBC';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${t?.name || 'tournament'}`} style={s.card} onPress={() => router.push(`/(player)/tournament/${item.tournamentId}`)}>
      <View style={s.cardTop}>
        <View style={s.registeredBadge}><Text style={s.registeredText}>REGISTERED</Text></View>
        <Text style={s.eventType}>{item.eventType}</Text>
      </View>
      <Text style={s.name} numberOfLines={2}>{t?.name || 'Tournament details unavailable'}</Text>
      <View style={s.detailRow}><TournamentIcon name="location" size={16} /><Text style={s.meta} numberOfLines={1}>{venue}</Text></View>
      {date ? <View style={s.detailRow}><TournamentIcon name="calendar" size={16} /><Text style={s.meta}>{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text></View> : null}
      <View style={s.infoRow}>
        <View style={s.categoryBlock}><Text style={s.label}>Category</Text><Text style={s.value}>{category?.name || item.eventType}</Text></View>
        <View style={s.feeBox}><Text style={s.feeRupee}>₹</Text><View><Text style={s.feeLabel}>Entry fee</Text><Text style={s.feeValue}>{registrationFeeLabel(t)}</Text></View></View>
      </View>
      {item.eventType === 'DOUBLES' && <Text style={s.partner}>Partner: {partner?.fullName || 'Partner details unavailable'}</Text>}
      <View style={s.bottomRow}><View><Text style={s.status}>{item.status}</Text><Text style={s.statusSub}>{t?.completionStatus || t?.status || 'STATUS UNAVAILABLE'}</Text></View><Text style={s.arrow}>›</Text></View>
      {CANCELLABLE.includes(item.status) && <Pressable onPress={(event) => { event.stopPropagation(); if (!cancel.isPending) cancel.mutate(); }} style={s.cancelButton}><Text style={s.cancel}>{cancel.isPending ? 'Cancelling…' : 'Cancel registration'}</Text></Pressable>}
    </Pressable>
  );
}

export default function Registrations() {
  const id = useAuthStore((state) => state.user?.playerProfile?.id) || '';
  const params = useLocalSearchParams<{ filter?: string }>();
  const filter = params.filter === 'active' ? 'active' : 'all';
  const all = useRegistrations(id);
  const active = useActiveRegistrations(id);
  const rows = (filter === 'active' ? active.data : all.data) || [];
  const loading = all.isLoading || (filter === 'active' && active.isLoading);
  const error = all.isError || (filter === 'active' && active.isError);
  return (
    <ScreenContainer dark>
      <BackButton fallbackRoute="/(player)/" />
      <FlatList
        data={rows as Row[]}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <EntryCard item={item} playerId={id} />}
        contentContainerStyle={s.content}
        ListHeaderComponent={<View><Text style={s.title}>My Entries</Text><Text style={s.subtitle}>Your registered tournaments</Text><View style={s.filters}>{(['all', 'active'] as const).map((value) => <Pressable key={value} onPress={() => router.setParams({ filter: value })} style={[s.filter, filter === value && s.filterActive]}><Text style={[s.filterText, filter === value && s.filterTextActive]}>{value === 'all' ? 'All' : 'Active'}</Text></Pressable>)}</View>{loading && <Text style={s.muted}>Loading entries…</Text>}{error && <Text style={s.error}>Unable to load entries. Please try again.</Text>}</View>}
        ListEmptyComponent={!loading && !error ? <View style={s.empty}><TournamentIcon name="trophy" size={30} /><Text style={s.emptyTitle}>{filter === 'active' ? 'No active entries' : 'No tournament entries yet'}</Text><Text style={s.emptyText}>Register for a tournament and it will appear here.</Text><Pressable style={s.browse} onPress={() => router.push('/(player)/tournaments')}><Text style={s.browseText}>Browse Tournaments</Text></Pressable></View> : null}
      />
      <BottomNav active="Home" />
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 100 }, title: { color: colors.white, fontSize: 30, fontWeight: '900', marginTop: 18 }, subtitle: { color: '#A7B7B1', fontSize: 14, marginTop: 5 }, filters: { flexDirection: 'row', gap: 8, marginVertical: 18 }, filter: { borderWidth: 1, borderColor: '#286652', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8 }, filterActive: { backgroundColor: colors.lime, borderColor: colors.lime }, filterText: { color: '#C8DED1', fontWeight: '800' }, filterTextActive: { color: colors.primaryDark }, card: { backgroundColor: '#082D24', borderWidth: 1, borderColor: '#0D6049', borderRadius: 18, padding: 15, marginBottom: 12 }, cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, registeredBadge: { backgroundColor: 'rgba(138,226,52,0.16)', borderWidth: 1, borderColor: colors.lime, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 }, registeredText: { color: colors.lime, fontSize: 10, fontWeight: '900' }, eventType: { color: '#D8FF4F', fontSize: 11, fontWeight: '900' }, name: { color: colors.white, fontSize: 19, fontWeight: '900', marginTop: 12 }, detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 }, meta: { color: '#C8DED1', fontSize: 13, flex: 1 }, infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 10 }, categoryBlock: { flex: 1 }, label: { color: '#85A99B', fontSize: 11 }, value: { color: colors.white, fontSize: 14, fontWeight: '800', marginTop: 3 }, feeBox: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#06251F', borderWidth: 1.5, borderColor: colors.lime, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, minWidth: 104 }, feeRupee: { color: colors.primaryDark, backgroundColor: colors.lime, width: 24, height: 24, borderRadius: 12, textAlign: 'center', lineHeight: 24, fontSize: 14, fontWeight: '900' }, feeLabel: { color: '#A7B7B1', fontSize: 9, lineHeight: 11 }, feeValue: { color: '#D8FF4F', fontSize: 15, lineHeight: 17, fontWeight: '900' }, partner: { color: '#C8DED1', fontSize: 12, marginTop: 10 }, bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }, status: { color: colors.lime, fontSize: 12, fontWeight: '900' }, statusSub: { color: '#85A99B', fontSize: 10, marginTop: 3 }, arrow: { color: colors.lime, fontSize: 28, lineHeight: 28 }, cancelButton: { alignSelf: 'flex-start', marginTop: 10 }, cancel: { color: '#FF9A9A', fontWeight: '800', fontSize: 12 }, empty: { alignItems: 'center', backgroundColor: '#082D24', borderWidth: 1, borderColor: '#0D6049', borderRadius: 18, padding: 26, marginTop: 8 }, emptyTitle: { color: colors.white, fontSize: 18, fontWeight: '900', marginTop: 12 }, emptyText: { color: '#A7B7B1', textAlign: 'center', marginTop: 7 }, browse: { backgroundColor: colors.lime, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, marginTop: 16 }, browseText: { color: colors.primaryDark, fontWeight: '900' }, muted: { color: '#A7B7B1', marginBottom: 10 }, error: { color: '#FF9A9A', marginBottom: 10 },
});
