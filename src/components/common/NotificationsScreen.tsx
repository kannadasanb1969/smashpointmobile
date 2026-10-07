import { ActivityIndicator, Pressable, Text, View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ScreenContainer } from './ScreenContainer';
import { BackButton } from './BackButton';
import { TournamentIcon, type TournamentIconName } from './TournamentIcon';
import { useAuthStore } from '../../store/authStore';
import { useNotifications, type Notification } from '../../features/player/notifications';
import { connectionKeys, playerApi, useAcceptConnection, useDeclineConnection } from '../../features/player/api';
import {
  friendlyApi,
  useAcceptFriendlyInvitation,
  useDeclineFriendlyInvitation,
} from '../../features/player/friendly';
import { colors, radius, spacing } from '../../theme';
import { PrimaryButton } from './PrimaryButton';

// Shared by app/(player)/notifications.tsx, app/(organizer)/notifications.tsx and
// app/(admin)/notifications.tsx — identical for all three roles (notifications are filtered
// by recipientId/recipientRole server-side), so this is the one implementation all three render.

// `link` encodes which existing entity a notification points at, as "<kind>:<id>" —
// see notification.events.js callers in player-connection.service.js and
// friendly-match-invitation.service.js. Any type without a recognized kind falls back to
// the original plain-text card unchanged.
const parseLink = (link?: string) => {
  if (!link) return null;
  const i = link.indexOf(':');
  if (i < 0) return null;
  return { kind: link.slice(0, i), value: link.slice(i + 1) };
};

// The "request-type" filter groups notifications that are (or were) actionable request/invite
// flows — purely a client-side view over the same list, no new backend category.
const REQUEST_TYPES = new Set(['CONNECTION_REQUEST', 'FRIENDLY_MATCH_INVITE']);

const TYPE_ICON: Record<string, TournamentIconName> = {
  CONNECTION_REQUEST: 'people',
  CONNECTION_ACCEPTED: 'check',
  FRIENDLY_MATCH_INVITE: 'shuttle',
  FRIENDLY_MATCH_JOINED: 'check',
};

const timeAgo = (iso?: string) => {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMin = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function CardShell({
  item,
  icon,
  title,
  onOpen,
  children,
}: {
  item: Notification;
  icon: TournamentIconName;
  title: string;
  onOpen?: () => void;
  children: ReactNode;
}) {
  return (
    <View style={[s.card, !item.isRead && s.unread]}>
      <Pressable onPress={onOpen} disabled={!onOpen}>
        <View style={s.cardHeader}>
          <View style={[s.iconBadge, !item.isRead && s.iconBadgeUnread]}>
            <TournamentIcon name={icon} size={16} />
          </View>
          <View style={s.cardHeaderCopy}>
            <Text style={s.cardTitle}>{title}</Text>
            <Text style={s.cardTime}>{timeAgo(item.createdAt)}</Text>
          </View>
          {!item.isRead && <View style={s.unreadDot} />}
        </View>
        <Text style={s.cardMessage}>{item.message}</Text>
      </Pressable>
      {children}
    </View>
  );
}

function ConnectionRequestCard({
  item,
  stillPending,
  onAccept,
  onDecline,
  onOpen,
}: {
  item: Notification;
  stillPending: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onOpen: () => void;
}) {
  return (
    <CardShell item={item} icon="people" title={item.title || 'Connection Request'} onOpen={onOpen}>
      {stillPending ? (
        <View style={s.actionRow}>
          <Pressable onPress={onDecline} hitSlop={8}>
            <Text style={s.decline}>Decline</Text>
          </Pressable>
          <Pressable style={s.acceptBtn} onPress={onAccept}>
            <Text style={s.acceptBtnText}>Accept</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={s.resolved}>Resolved</Text>
      )}
    </CardShell>
  );
}

// The invitation domain is the source of truth (not this notification row), so this fetches
// the invitation's live status before deciding whether Join Match/Decline are still valid —
// same principle as ConnectionRequestCard's cross-check against pendingReceived above, just
// per-item here since an invitation is looked up by id, not by list membership.
function FriendlyInviteCard({
  item,
  invitationId,
  onAccept,
  onDecline,
  onOpen,
}: {
  item: Notification;
  invitationId: string;
  onAccept: () => void;
  onDecline: () => void;
  onOpen: () => void;
}) {
  const status = useQuery({
    queryKey: ['friendly-invitation', invitationId],
    queryFn: () => friendlyApi.invitation(invitationId),
    enabled: Boolean(invitationId),
  });
  const stillPending = status.data?.status === 'PENDING';
  const resolvedLabel =
    status.data?.status === 'ACCEPTED' ? 'Accepted' : status.data?.status === 'DECLINED' ? 'Declined' : 'Resolved';
  return (
    <CardShell item={item} icon="shuttle" title={item.title || 'Friendly Match Invitation'} onOpen={onOpen}>
      {status.isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} style={s.inlineLoading} />
      ) : stillPending ? (
        <View style={s.actionRow}>
          <Pressable onPress={onDecline} hitSlop={8}>
            <Text style={s.decline}>Decline</Text>
          </Pressable>
          <Pressable style={s.acceptBtn} onPress={onAccept}>
            <Text style={s.acceptBtnText}>Join Match</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={s.resolved}>{resolvedLabel}</Text>
      )}
    </CardShell>
  );
}

function FriendlyJoinedCard({ item, onViewMatch }: { item: Notification; onViewMatch: () => void }) {
  return (
    <CardShell item={item} icon="check" title={item.title || 'Player Joined'} onOpen={onViewMatch}>
      <Pressable onPress={onViewMatch} hitSlop={8}>
        <Text style={s.viewProfile}>View Friendly Match →</Text>
      </Pressable>
    </CardShell>
  );
}

function ConnectionAcceptedCard({ item, onViewProfile }: { item: Notification; onViewProfile: () => void }) {
  return (
    <CardShell item={item} icon="check" title={item.title || 'Connection Accepted'} onOpen={onViewProfile}>
      <Pressable onPress={onViewProfile} hitSlop={8}>
        <Text style={s.viewProfile}>View Profile →</Text>
      </Pressable>
    </CardShell>
  );
}

export function NotificationsScreen() {
  const id = useAuthStore((s) => s.user?.id) || '';
  const workspace = useAuthStore((s) => s.activeWorkspace);
  const isPlayer = workspace === 'PLAYER';
  const router = useRouter();
  const n = useNotifications(id);
  const [filter, setFilter] = useState<'All' | 'Requests'>('All');
  // Connection domain is the source of truth for actionability — a CONNECTION_REQUEST
  // notification only shows Accept/Decline while its connection is still genuinely PENDING
  // here, whether resolved via this screen, the Requests tab, or a race between the two.
  const pendingReceived = useQuery({
    queryKey: connectionKeys.requests,
    queryFn: playerApi.connectionRequests,
    enabled: isPlayer,
  });
  const accept = useAcceptConnection();
  const decline = useDeclineConnection();
  const acceptInvite = useAcceptFriendlyInvitation();
  const declineInvite = useDeclineFriendlyInvitation();
  const client = useQueryClient();
  const fallbackRoute =
    workspace === 'ORGANIZER' ? '/(organizer)/' : workspace === 'ADMIN' ? '/(admin)/' : '/(player)/';

  const markReadAndRefetch = (notificationId: string) => {
    n.read.mutate(notificationId);
  };
  const afterConnectionAction = () => {
    void pendingReceived.refetch();
    void n.list.refetch();
    void n.unread.refetch();
  };
  const afterFriendlyAction = (invitationId: string) => {
    void n.list.refetch();
    void n.unread.refetch();
    void client.invalidateQueries({ queryKey: ['friendly-invitation', invitationId] });
  };

  const allItems = n.list.data || [];
  const items = filter === 'Requests' ? allItems.filter((x) => REQUEST_TYPES.has(x.type || '')) : allItems;
  const requestCount = allItems.filter((x) => REQUEST_TYPES.has(x.type || '')).length;

  return (
    <ScreenContainer>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={n.list.isFetching}
            onRefresh={() => {
              void n.list.refetch();
              void n.unread.refetch();
              if (isPlayer) void pendingReceived.refetch();
            }}
          />
        }
      >
        <BackButton fallbackRoute={fallbackRoute} />
        <Text style={s.title}>Notifications {n.unread.data ? `(${n.unread.data})` : ''}</Text>

        <View style={s.filterRow}>
          {(['All', 'Requests'] as const).map((f) => (
            <Pressable key={f} onPress={() => setFilter(f)} style={[s.filterChip, filter === f && s.filterChipActive]}>
              <Text style={[s.filterChipText, filter === f && s.filterChipTextActive]}>
                {f === 'Requests' ? `Requests (${requestCount})` : 'All'}
              </Text>
            </Pressable>
          ))}
        </View>

        {n.list.isLoading && (
          <View style={s.state}>
            <ActivityIndicator color={colors.primary} />
            <Text style={s.muted}>Loading notifications…</Text>
          </View>
        )}
        {n.list.isError && (
          <Pressable onPress={() => n.list.refetch()} style={s.errorBlock}>
            <Text style={s.errorTitle}>Unable to load notifications.</Text>
            <Text style={s.errorRetry}>Tap to retry</Text>
          </Pressable>
        )}
        {!n.list.isLoading && !n.list.isError && !items.length && (
          <View style={s.emptyBlock}>
            <Text style={s.emptyTitle}>{filter === 'Requests' ? 'No requests right now.' : "You're all caught up."}</Text>
          </View>
        )}
        {items.map((x) => {
          const parsed = parseLink(x.link);
          if (isPlayer && x.type === 'CONNECTION_REQUEST' && parsed?.kind === 'connection') {
            const connectionId = parsed.value;
            const stillPending = (pendingReceived.data?.received || []).some(
              (r: any) => String(r.connectionId) === connectionId,
            );
            return (
              <ConnectionRequestCard
                key={x.id}
                item={x}
                stillPending={stillPending}
                onOpen={() => !x.isRead && markReadAndRefetch(x.id)}
                onAccept={() => {
                  markReadAndRefetch(x.id);
                  accept.mutate(connectionId, {
                    onSuccess: afterConnectionAction,
                    onError: afterConnectionAction,
                  });
                }}
                onDecline={() => {
                  markReadAndRefetch(x.id);
                  decline.mutate(connectionId, {
                    onSuccess: afterConnectionAction,
                    onError: afterConnectionAction,
                  });
                }}
              />
            );
          }
          if (isPlayer && x.type === 'CONNECTION_ACCEPTED' && parsed?.kind === 'player') {
            const playerId = parsed.value;
            return (
              <ConnectionAcceptedCard
                key={x.id}
                item={x}
                onViewProfile={() => {
                  markReadAndRefetch(x.id);
                  router.push({ pathname: '/(player)/player/[id]', params: { id: playerId } });
                }}
              />
            );
          }
          if (isPlayer && x.type === 'FRIENDLY_MATCH_INVITE' && parsed?.kind === 'friendly-invitation') {
            // link is "friendly-invitation:<invitationId>:<friendlyMatchId>" — value still
            // holds the remaining "<invitationId>:<friendlyMatchId>" since parseLink only
            // splits on the first colon.
            const invitationId = parsed.value.split(':')[0];
            return (
              <FriendlyInviteCard
                key={x.id}
                item={x}
                invitationId={invitationId}
                onOpen={() => !x.isRead && markReadAndRefetch(x.id)}
                onAccept={() => {
                  markReadAndRefetch(x.id);
                  acceptInvite.mutate(invitationId, {
                    onSuccess: () => afterFriendlyAction(invitationId),
                    onError: () => afterFriendlyAction(invitationId),
                  });
                }}
                onDecline={() => {
                  markReadAndRefetch(x.id);
                  declineInvite.mutate(invitationId, {
                    onSuccess: () => afterFriendlyAction(invitationId),
                    onError: () => afterFriendlyAction(invitationId),
                  });
                }}
              />
            );
          }
          if (isPlayer && x.type === 'FRIENDLY_MATCH_JOINED' && parsed?.kind === 'friendly-match') {
            const friendlyMatchId = parsed.value;
            return (
              <FriendlyJoinedCard
                key={x.id}
                item={x}
                onViewMatch={() => {
                  markReadAndRefetch(x.id);
                  router.push({ pathname: '/(player)/friendly/[id]', params: { id: friendlyMatchId } });
                }}
              />
            );
          }
          return (
            <CardShell
              key={x.id}
              item={x}
              icon={TYPE_ICON[x.type || ''] || 'info'}
              title={x.title || 'Notification'}
              onOpen={() => !x.isRead && n.read.mutate(x.id)}
            >
              <View />
            </CardShell>
          );
        })}
        {Boolean(allItems.some((x) => !x.isRead)) && (
          <PrimaryButton title="Mark all as read" onPress={() => n.readAll.mutate()} />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '900', color: colors.text, marginTop: 35, marginBottom: spacing.md },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  filterChip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  filterChipText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
  filterChipTextActive: { color: colors.white },
  state: { alignItems: 'center', padding: spacing.section, gap: spacing.sm },
  muted: { color: colors.muted, fontSize: 13 },
  errorBlock: { backgroundColor: '#FFF7F7', borderColor: '#F0D7D7', borderWidth: 1, borderRadius: radius.medium, padding: spacing.lg, alignItems: 'center' },
  errorTitle: { color: colors.text, fontWeight: '800' },
  errorRetry: { color: colors.error, fontWeight: '800', marginTop: 4, fontSize: 12 },
  emptyBlock: { backgroundColor: colors.surfaceTint, borderRadius: radius.medium, padding: spacing.lg, alignItems: 'center' },
  emptyTitle: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  card: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radius.large,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unread: { borderColor: colors.primary, borderWidth: 1.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardHeaderCopy: { flex: 1, minWidth: 0 },
  iconBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  iconBadgeUnread: { backgroundColor: 'rgba(15, 122, 79, 0.14)' },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  cardTime: { color: colors.muted, fontSize: 11, marginTop: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  cardMessage: { color: colors.text, marginTop: 8, fontSize: 13, lineHeight: 19 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16, marginTop: spacing.md },
  decline: { color: colors.error, fontWeight: '800' },
  acceptBtn: { backgroundColor: colors.lime, borderRadius: radius.medium, paddingVertical: 9, paddingHorizontal: 16 },
  acceptBtnText: { color: colors.primaryDark, fontWeight: '900' },
  resolved: { color: colors.muted, marginTop: spacing.sm, fontSize: 12, fontStyle: 'italic' },
  viewProfile: { color: colors.primary, fontWeight: '800', marginTop: spacing.sm },
  inlineLoading: { alignSelf: 'flex-end', marginTop: spacing.sm },
});
