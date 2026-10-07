import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useAuthStore } from '../../../src/store/authStore';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { BackButton } from '../../../src/components/common/BackButton';
import { PlayerAvatar } from '../../../src/components/common/PlayerAvatar';
import { colors, radius, shadows, spacing } from '../../../src/theme';
import {
  friendlyIsOwner,
  useFriendlyDetail,
  useFriendlyInviteCandidates,
  useFriendlyInvite,
} from '../../../src/features/player/friendly';

type CandidateState = 'AVAILABLE' | 'INVITED' | 'JOINED' | 'REQUEST_PENDING' | 'UNAVAILABLE';

const stateLabel: Record<CandidateState, string> = {
  AVAILABLE: 'Invite',
  INVITED: 'Invited',
  JOINED: 'Joined',
  REQUEST_PENDING: 'Request Pending',
  UNAVAILABLE: 'Unavailable',
};

export default function InvitePlayers() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useAuthStore((s) => s.user?.playerProfile?.id || s.user?.id) || '';
  const [search, setSearch] = useState('');
  const detail = useFriendlyDetail(id);
  const owner = friendlyIsOwner(detail.data, me);
  const candidates = useFriendlyInviteCandidates(id, owner);
  const invite = useFriendlyInvite(id);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const list = (candidates.data || []) as { player: { id: string; fullName: string; playerCode: string }; state: CandidateState }[];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (x) => x.player.fullName?.toLowerCase().includes(q) || x.player.playerCode?.toLowerCase().includes(q),
    );
  }, [list, search]);

  if (!owner) {
    return (
      <ScreenContainer>
        <BackButton />
        <View style={s.notice}>
          <Text style={s.noticeTitle}>Host access only</Text>
          <Text style={s.muted}>Only the friendly match creator can invite players.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={candidates.isFetching} onRefresh={() => candidates.refetch()} />}
      >
        <BackButton />
        <Text style={s.title}>Invite Players</Text>
        <Text style={s.subtitle}>{detail.data?.title || 'Friendly Match'} · Only your accepted connections are shown</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search connections…"
          placeholderTextColor={colors.muted}
          style={s.search}
        />
        {candidates.isLoading && (
          <View style={s.state}>
            <ActivityIndicator color={colors.primary} />
            <Text style={s.muted}>Loading connections…</Text>
          </View>
        )}
        {candidates.isError && (
          <Pressable onPress={() => candidates.refetch()} style={s.errorBlock}>
            <Text style={s.errorTitle}>Unable to load invitations.</Text>
            <Text style={s.errorRetry}>Tap to retry</Text>
          </Pressable>
        )}
        {!candidates.isLoading && !candidates.isError && !filtered.length && (
          <View style={s.empty}>
            <Text style={s.muted}>
              {list.length
                ? 'No connections match your search.'
                : 'No connected players available to invite.'}
            </Text>
          </View>
        )}
        {filtered.map((x) => {
          const disabled = x.state !== 'AVAILABLE' || (invite.isPending && pendingId === x.player.id);
          return (
            <View key={x.player.id} style={s.card}>
              <View style={s.cardTop}>
                <PlayerAvatar name={x.player.fullName} size={40} />
                <View style={s.identity}>
                  <Text style={s.name} numberOfLines={1}>{x.player.fullName}</Text>
                  <Text style={s.code}>{x.player.playerCode}</Text>
                </View>
              </View>
              <Pressable
                disabled={disabled}
                onPress={() => {
                  setPendingId(x.player.id);
                  invite.mutate(x.player.id, {
                    onError: (e: any) => Alert.alert('Unable to invite', e?.message || 'Please try again.'),
                    onSettled: () => setPendingId(null),
                  });
                }}
                style={[s.actionBtn, x.state !== 'AVAILABLE' && s.actionBtnDisabled]}
              >
                {invite.isPending && pendingId === x.player.id ? (
                  <ActivityIndicator size="small" color={colors.primaryDark} />
                ) : (
                  <Text style={[s.actionText, x.state !== 'AVAILABLE' && s.actionTextDisabled]}>
                    {stateLabel[x.state]}
                  </Text>
                )}
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: spacing.md },
  subtitle: { color: colors.muted, lineHeight: 20, marginTop: 6, marginBottom: spacing.md },
  search: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: spacing.md,
    color: colors.text,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 0, marginRight: spacing.md },
  identity: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 16, fontWeight: '900' },
  code: { color: colors.muted, fontSize: 11, marginTop: 4 },
  actionBtn: {
    backgroundColor: colors.lime,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  actionBtnDisabled: { backgroundColor: colors.disabled },
  actionText: { color: colors.primaryDark, fontWeight: '900', fontSize: 13 },
  actionTextDisabled: { color: '#7A8B85' },
  state: { alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  errorBlock: { backgroundColor: '#FFF7F7', borderColor: '#F0D7D7', borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center' },
  errorTitle: { color: colors.text, fontWeight: '800' },
  errorRetry: { color: colors.error, fontWeight: '800', marginTop: 4, fontSize: 12 },
  empty: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg },
  muted: { color: colors.muted, lineHeight: 20 },
  notice: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.xl, ...shadows.card },
  noticeTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: spacing.sm },
});
