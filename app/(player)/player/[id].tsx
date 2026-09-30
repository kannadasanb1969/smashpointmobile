import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { SmashConfirmModal } from '../../../src/components/common/SmashConfirmModal';
import { PlayerAvatar } from '../../../src/components/common/PlayerAvatar';
import { colors, radius, spacing } from '../../../src/theme';
import { useAcceptConnection, useConnectionProfile, useDeclineConnection, useRequestConnection, useUnconnect } from '../../../src/features/player/api';

export default function PlayerProfile() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useConnectionProfile(String(id));
  const [confirm, setConfirm] = useState(false);
  const request = useRequestConnection();
  const accept = useAcceptConnection();
  const decline = useDeclineConnection();
  const unconnect = useUnconnect();
  const player = query.data?.player;
  const state = query.data?.connectionState;

  return (
    <ScreenContainer>
      <Pressable onPress={() => router.back()} hitSlop={8}>
        <Text style={s.back}>‹ Players</Text>
      </Pressable>

      {query.isLoading && (
        <View style={s.state}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.muted}>Loading profile…</Text>
        </View>
      )}
      {query.isError && (
        <Pressable onPress={() => query.refetch()} style={s.errorBlock}>
          <Text style={s.errorTitle}>Unable to load this profile.</Text>
          <Text style={s.errorRetry}>Tap to retry</Text>
        </Pressable>
      )}

      {player && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <PlayerAvatar name={player.fullName} size={64} />
            <View style={s.headerCopy}>
              <Text style={s.title}>{player.fullName}</Text>
              <Text style={s.code}>{player.playerCode}</Text>
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.label}>Location</Text>
            <Text style={s.value}>{player.location || 'Not provided'}</Text>
            <Text style={s.label}>Playing since</Text>
            <Text style={s.value}>{player.playingSince || 'Not provided'}</Text>
            <Text style={s.label}>Court / academy</Text>
            <Text style={s.value}>{player.courtAcademy || 'Not provided'}</Text>
          </View>

          <View style={s.actions}>
            {state === 'NONE' && (
              <Pressable
                style={s.primary}
                disabled={request.isPending}
                onPress={() => request.mutate(String(id))}
              >
                {request.isPending ? (
                  <ActivityIndicator size="small" color={colors.primaryDark} />
                ) : (
                  <Text style={s.primaryText}>Connect</Text>
                )}
              </Pressable>
            )}
            {state === 'REQUESTED' && (
              <View style={s.statusPill}>
                <Text style={s.statusPillText}>Requested</Text>
              </View>
            )}
            {state === 'INCOMING' && (
              <>
                <Pressable
                  style={s.primary}
                  disabled={accept.isPending}
                  onPress={() => accept.mutate(String(query.data.connectionId))}
                >
                  {accept.isPending ? (
                    <ActivityIndicator size="small" color={colors.primaryDark} />
                  ) : (
                    <Text style={s.primaryText}>Accept Request</Text>
                  )}
                </Pressable>
                <Pressable
                  disabled={decline.isPending}
                  onPress={() => decline.mutate(String(query.data.connectionId))}
                  hitSlop={8}
                >
                  <Text style={s.decline}>Decline</Text>
                </Pressable>
              </>
            )}
            {state === 'CONNECTED' && (
              <>
                <View style={[s.statusPill, s.statusPillConnected]}>
                  <Text style={[s.statusPillText, s.statusPillTextConnected]}>Connected ✓</Text>
                </View>
                <Pressable onPress={() => setConfirm(true)} hitSlop={8}>
                  <Text style={s.decline}>Unconnect</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      )}

      <SmashConfirmModal
        visible={confirm}
        title="Unconnect player?"
        message="This only removes the connection. Your profile and match history stay unchanged."
        confirmText="Unconnect"
        variant="danger"
        onCancel={() => setConfirm(false)}
        onConfirm={() => unconnect.mutate(String(query.data?.connectionId), { onSettled: () => setConfirm(false) })}
        loading={unconnect.isPending}
      />
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  back: { color: colors.primary, fontSize: 16, fontWeight: '800', marginTop: 20 },
  state: { alignItems: 'center', padding: spacing.section, gap: spacing.sm },
  muted: { color: colors.muted, fontSize: 13 },
  errorBlock: { backgroundColor: '#FFF7F7', borderColor: '#F0D7D7', borderWidth: 1, borderRadius: radius.medium, padding: spacing.lg, alignItems: 'center', marginTop: spacing.lg },
  errorTitle: { color: colors.text, fontWeight: '800' },
  errorRetry: { color: colors.error, fontWeight: '800', marginTop: 4, fontSize: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 24 },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontSize: 26, fontWeight: '900' },
  code: { color: colors.muted, marginTop: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.large, padding: 20, marginTop: 24, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.muted, marginTop: 12, fontSize: 12 },
  value: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: 20 },
  primary: { backgroundColor: colors.lime, borderRadius: radius.medium, paddingVertical: 12, paddingHorizontal: 18, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.primaryDark, fontWeight: '900' },
  statusPill: { backgroundColor: colors.surfaceTint, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 16 },
  statusPillConnected: { backgroundColor: 'rgba(27, 156, 98, 0.12)' },
  statusPillText: { color: colors.text, fontWeight: '900', fontSize: 13 },
  statusPillTextConnected: { color: colors.success },
  decline: { color: colors.error, fontWeight: '800' },
});
