import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { BottomNav } from '../../src/components/common/BottomNav';
import { SmashConfirmModal } from '../../src/components/common/SmashConfirmModal';
import { PlayerAvatar } from '../../src/components/common/PlayerAvatar';
import {
  useAcceptConnection,
  useAcceptedConnections,
  useConnectionDiscover,
  useConnectionRequests,
  useDeclineConnection,
  useRequestConnection,
  useUnconnect,
} from '../../src/features/player/api';
import { colors, radius, spacing } from '../../src/theme';

type Tab = 'Discover' | 'Connections' | 'Requests';

// Relationship state -> button label/style is derived entirely from the authoritative
// connectionState/requestType the backend returns — never inferred client-side — so a
// screen can never show two contradictory actions (Connect + Requested, etc).
function relationshipAction(state: string) {
  if (state === 'CONNECTED') return { label: 'Connected ✓', kind: 'connected' as const };
  if (state === 'REQUESTED' || state === 'Sent') return { label: 'Requested', kind: 'pending' as const };
  if (state === 'INCOMING' || state === 'Received') return { label: 'Accept Request', kind: 'action' as const };
  return { label: 'Connect', kind: 'action' as const };
}

function PlayerRow({
  name,
  code,
  location,
  actionLabel,
  actionKind,
  actionLoading,
  onPressCard,
  onAction,
  trailing,
}: {
  name: string;
  code?: string;
  location?: string;
  actionLabel: string;
  actionKind: 'action' | 'pending' | 'connected';
  actionLoading?: boolean;
  onPressCard: () => void;
  onAction?: () => void;
  trailing?: ReactNode;
}) {
  const disabled = actionKind !== 'action' || actionLoading;
  return (
    <View style={s.card}>
      <Pressable style={s.cardTop} onPress={onPressCard} accessibilityRole="button" accessibilityLabel={`View ${name}`}>
        <PlayerAvatar name={name} />
        <View style={s.identity}>
          <Text style={s.name} numberOfLines={1}>{name}</Text>
          <Text style={s.meta} numberOfLines={1}>
            {code || 'Player'}{location ? ` · ${location}` : ''}
          </Text>
        </View>
      </Pressable>
      <View style={s.cardFooter}>
        <Pressable onPress={onPressCard} hitSlop={8}>
          <Text style={s.link}>View Profile</Text>
        </Pressable>
        <View style={s.footerRight}>
          {trailing}
          <Pressable
            disabled={disabled}
            onPress={onAction}
            style={[
              s.actionButton,
              actionKind === 'connected' && s.actionButtonConnected,
              actionKind === 'pending' && s.actionButtonPending,
              disabled && actionKind === 'action' && s.disabled,
            ]}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={colors.primaryDark} />
            ) : (
              <Text
                style={[
                  s.actionText,
                  actionKind === 'connected' && s.actionTextConnected,
                  actionKind === 'pending' && s.actionTextPending,
                ]}
              >
                {actionLabel}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SectionEmpty({ text }: { text: string }) {
  return (
    <View style={s.sectionEmpty}>
      <Text style={s.sectionEmptyText}>{text}</Text>
    </View>
  );
}

function LoadingBlock() {
  return (
    <View style={s.state}>
      <ActivityIndicator color={colors.primary} />
      <Text style={s.muted}>Loading…</Text>
    </View>
  );
}

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <Pressable onPress={onRetry} style={s.errorBlock}>
      <Text style={s.errorTitle}>Unable to load players.</Text>
      <Text style={s.errorRetry}>Tap to retry</Text>
    </Pressable>
  );
}

export default function Players() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('Discover');
  const [search, setSearch] = useState('');
  const [unconnectId, setUnconnectId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const discover = useConnectionDiscover(search.trim());
  const connected = useAcceptedConnections();
  const requests = useConnectionRequests();
  const request = useRequestConnection();
  const accept = useAcceptConnection();
  const decline = useDeclineConnection();
  const unconnect = useUnconnect();

  const openProfile = (id: string) => router.push({ pathname: '/(player)/player/[id]', params: { id } });

  const runAction = (key: string, run: () => void) => {
    if (pendingId) return;
    setPendingId(key);
    run();
  };

  return (
    <ScreenContainer>
      <Text style={s.title}>Players</Text>
      <View style={s.tabs}>
        {(['Discover', 'Connections', 'Requests'] as Tab[]).map((value) => (
          <Pressable
            key={value}
            onPress={() => setTab(value)}
            style={[s.tab, tab === value && s.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === value }}
          >
            <Text style={[s.tabText, tab === value && s.tabTextActive]}>{value}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'Discover' && (
        <TextInput
          accessibilityLabel="Search players"
          placeholder="Search by name or code"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          style={s.input}
        />
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
        {tab === 'Discover' &&
          (discover.isLoading ? (
            <LoadingBlock />
          ) : discover.isError ? (
            <ErrorBlock onRetry={() => discover.refetch()} />
          ) : !(discover.data || []).length ? (
            <SectionEmpty text="No players found." />
          ) : (
            (discover.data as any[]).map((item) => {
              const { label, kind } = relationshipAction(item.connectionState);
              const key = String(item.player.id);
              return (
                <PlayerRow
                  key={key}
                  name={item.player.fullName}
                  code={item.player.playerCode}
                  location={item.player.location}
                  actionLabel={label}
                  actionKind={kind}
                  actionLoading={pendingId === key && (request.isPending || accept.isPending)}
                  onPressCard={() => openProfile(item.player.id)}
                  onAction={() => {
                    if (item.connectionState === 'NONE') {
                      runAction(key, () => request.mutate(item.player.id, { onSettled: () => setPendingId(null) }));
                    } else if (item.connectionState === 'INCOMING') {
                      runAction(key, () => accept.mutate(item.connectionId, { onSettled: () => setPendingId(null) }));
                    }
                  }}
                />
              );
            })
          ))}

        {tab === 'Connections' &&
          (connected.isLoading ? (
            <LoadingBlock />
          ) : connected.isError ? (
            <ErrorBlock onRetry={() => connected.refetch()} />
          ) : !(connected.data || []).length ? (
            <SectionEmpty text="No connections yet. Connect with players to build your badminton network." />
          ) : (
            (connected.data as any[]).map((item) => (
              <PlayerRow
                key={String(item.connectionId)}
                name={item.player.fullName}
                code={item.player.playerCode}
                location={item.player.location}
                actionLabel="Connected ✓"
                actionKind="connected"
                onPressCard={() => openProfile(item.player.id)}
                trailing={
                  <Pressable onPress={() => setUnconnectId(item.connectionId)} hitSlop={8}>
                    <Text style={s.unconnectLink}>Unconnect</Text>
                  </Pressable>
                }
              />
            ))
          ))}

        {tab === 'Requests' &&
          (requests.isLoading ? (
            <LoadingBlock />
          ) : requests.isError ? (
            <ErrorBlock onRetry={() => requests.refetch()} />
          ) : (
            <>
              <Text style={s.sectionHeading}>Received Requests</Text>
              {(requests.data?.received || []).length ? (
                (requests.data.received as any[]).map((item) => {
                  const key = `received-${item.connectionId}`;
                  return (
                    <PlayerRow
                      key={key}
                      name={item.player.fullName}
                      code={item.player.playerCode}
                      location={item.player.location}
                      actionLabel="Accept"
                      actionKind="action"
                      actionLoading={pendingId === key && accept.isPending}
                      onPressCard={() => openProfile(item.player.id)}
                      onAction={() => runAction(key, () => accept.mutate(item.connectionId, { onSettled: () => setPendingId(null) }))}
                      trailing={
                        <Pressable
                          disabled={pendingId === key}
                          onPress={() => runAction(key, () => decline.mutate(item.connectionId, { onSettled: () => setPendingId(null) }))}
                          hitSlop={8}
                        >
                          <Text style={s.declineLink}>Decline</Text>
                        </Pressable>
                      }
                    />
                  );
                })
              ) : (
                <SectionEmpty text="No received requests." />
              )}

              <Text style={[s.sectionHeading, s.sectionHeadingSpaced]}>Sent Requests</Text>
              {(requests.data?.sent || []).length ? (
                (requests.data.sent as any[]).map((item) => (
                  <PlayerRow
                    key={`sent-${item.connectionId}`}
                    name={item.player.fullName}
                    code={item.player.playerCode}
                    location={item.player.location}
                    actionLabel="Requested"
                    actionKind="pending"
                    onPressCard={() => openProfile(item.player.id)}
                  />
                ))
              ) : (
                <SectionEmpty text="No sent requests." />
              )}
            </>
          ))}
      </ScrollView>

      <BottomNav active="Players" />
      <SmashConfirmModal
        visible={Boolean(unconnectId)}
        title="Unconnect player?"
        message="This only removes the connection. Your profile and match history stay unchanged."
        confirmText="Unconnect"
        variant="danger"
        onCancel={() => setUnconnectId(null)}
        onConfirm={() => {
          if (unconnectId) unconnect.mutate(unconnectId, { onSettled: () => setUnconnectId(null) });
        }}
        loading={unconnect.isPending}
      />
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '900', color: colors.text, marginTop: 35, marginBottom: 14 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: {
    flex: 1,
    borderRadius: radius.pill,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  tabActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  tabText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
  tabTextActive: { color: colors.white },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
    padding: 14,
    marginBottom: spacing.sm,
    color: colors.text,
  },
  list: { paddingBottom: spacing.xl },
  sectionHeading: { color: colors.muted, fontSize: 12, fontWeight: '900', letterSpacing: 0.6, marginTop: spacing.sm, marginBottom: spacing.sm },
  sectionHeadingSpaced: { marginTop: spacing.lg },
  sectionEmpty: { backgroundColor: colors.surfaceTint, borderRadius: radius.medium, padding: spacing.lg, marginBottom: spacing.sm },
  sectionEmptyText: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  state: { alignItems: 'center', padding: spacing.section, gap: spacing.sm },
  muted: { color: colors.muted, fontSize: 13 },
  errorBlock: { backgroundColor: '#FFF7F7', borderColor: '#F0D7D7', borderWidth: 1, borderRadius: radius.medium, padding: spacing.lg, alignItems: 'center' },
  errorTitle: { color: colors.text, fontWeight: '800' },
  errorRetry: { color: colors.error, fontWeight: '800', marginTop: 4, fontSize: 12 },
  card: { backgroundColor: colors.white, padding: spacing.lg, borderRadius: radius.large, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identity: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '800', color: colors.text },
  meta: { color: colors.muted, marginTop: 3, fontSize: 12 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  link: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  unconnectLink: { color: colors.error, fontWeight: '800', fontSize: 13 },
  declineLink: { color: colors.error, fontWeight: '800', fontSize: 13 },
  actionButton: { backgroundColor: colors.lime, borderRadius: radius.medium, minHeight: 38, minWidth: 44, paddingVertical: 9, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  actionButtonConnected: { backgroundColor: colors.surfaceTint },
  actionButtonPending: { backgroundColor: colors.disabled },
  actionText: { color: colors.primaryDark, fontWeight: '900', fontSize: 12 },
  actionTextConnected: { color: colors.success },
  actionTextPending: { color: colors.text },
  disabled: { opacity: 0.55 },
});
