import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../src/store/authStore';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { BackButton } from '../../../src/components/common/BackButton';
import { colors, radius, shadows, spacing } from '../../../src/theme';
import { TournamentIcon } from '../../../src/components/common/TournamentIcon';
import { friendlyApi, friendlyKeys, friendlyIsOwner, useFriendlyDetail, useFriendlyRequests, useFriendlyParticipants, useFriendlyDecision, pendingRequest, classifyFriendlyRequestFailure, recoverFriendlyRequestFailure, friendlyPairingReady, friendlyPairingLocked } from '../../../src/features/player/friendly';

const nameOf = (x: any) => x.full_name || x.fullName || x.playerName || x.player_name || 'Player details unavailable';
const codeOf = (x: any) => x.playerCode || x.player_code || x.playerId || x.player_id;
const idOf = (x: any) => String(x.player_id || x.id);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'P';

export default function Requests() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useAuthStore(s => s.user?.playerProfile?.id) || '';
  const client = useQueryClient();
  const detail = useFriendlyDetail(id); const owner = friendlyIsOwner(detail.data, me);
  const requests = useFriendlyRequests(id, owner); const participants = useFriendlyParticipants(id);
  const teams = useQuery({ queryKey: friendlyKeys.teams(id), queryFn: () => friendlyApi.teams(id), enabled: owner });
  const fixtures = useQuery({ queryKey: friendlyKeys.fixtures(id), queryFn: () => friendlyApi.fixtures(id), enabled: owner });
  const approve = useFriendlyDecision(id, 'approve'); const reject = useFriendlyDecision(id, 'reject');
  const [active, setActive] = useState<string | null>(null); const [activeKind, setActiveKind] = useState<'approve' | 'reject' | null>(null); const [selected, setSelected] = useState<string[]>([]);
  const refresh = () => Promise.all([detail.refetch(), requests.refetch(), participants.refetch(), teams.refetch(), fixtures.refetch()]);
  const decide = (requestId: string, kind: 'approve' | 'reject') => { if (active) return; setActive(requestId); setActiveKind(kind); (kind === 'approve' ? approve : reject).mutate(requestId, { onSuccess: () => { void Promise.all([requests.refetch(), participants.refetch(), detail.refetch()]); }, onError: async (e: any) => { const f = classifyFriendlyRequestFailure(e); if (f !== 'NORMAL_ERROR') await recoverFriendlyRequestFailure(client, id); Alert.alert(f === 'CAPACITY_FULL' ? 'Match is full' : 'Unable to update request', e?.message || 'Please retry.'); }, onSettled: () => { setActive(null); setActiveKind(null); } }); };
  const addTeam = useMutation({ mutationFn: (ids: [string, string]) => friendlyApi.addTeam({ id, playerIds: ids }), onSuccess: () => { setSelected([]); void Promise.all([teams.refetch(), participants.refetch()]); }, onError: (e: any) => Alert.alert('Unable to create pair', e?.message || 'Select exactly two players.') });
  const removeTeam = useMutation({ mutationFn: (teamId: string) => friendlyApi.deleteTeam({ id, teamId }), onSuccess: () => void teams.refetch(), onError: (e: any) => Alert.alert('Unable to remove pair', e?.message || 'Please try again.') });
  const shuffle = useMutation({ mutationFn: () => friendlyApi.shuffle(id), onSuccess: () => void teams.refetch(), onError: (e: any) => Alert.alert('Unable to shuffle remaining players', e?.message || 'Please try again.') });
  const generate = useMutation({ mutationFn: () => friendlyApi.generateFixtures(id), onSuccess: () => void Promise.all([fixtures.refetch(), detail.refetch()]), onError: (e: any) => Alert.alert('Unable to generate fixtures', e?.message || 'Please try again.') });
  if (!owner) return <ScreenContainer><Header/><View style={s.notice}><Text style={s.noticeTitle}>Host access only</Text><Text style={s.muted}>Only the friendly match creator can manage this match.</Text></View></ScreenContainer>;
  const pending = (requests.data || []).filter((x: any) => pendingRequest(x.status)); const confirmed = participants.data || []; const teamRows = teams.data || [];
  const paired = new Set(teamRows.flatMap((x: any) => (x.members || []).map((m: any) => String(m.id || m.player_id)))); const unpaired = confirmed.filter((x: any) => !paired.has(String(x.player_id || x.id)));
  const min = detail.data?.event_type === 'SINGLES' ? 6 : 8; const enough = confirmed.length >= min; const locked = friendlyPairingLocked(fixtures.data); const ready = friendlyPairingReady(detail.data, confirmed, teamRows); const matches = fixtures.data?.matches?.length || 0;
  return <ScreenContainer><ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={detail.isFetching || requests.isFetching || participants.isFetching || teams.isFetching} onRefresh={refresh}/>}> 
    <Header/><Text style={s.title}>Join Requests</Text><Text style={s.subtitle}>{detail.data?.title || 'Friendly Match'} · Review and manage your players</Text>
    <Section title="PENDING REQUESTS" count={`${pending.length} Pending`}/>{requests.isLoading ? <Loading/> : pending.length ? pending.map((x: any) => <RequestCard key={x.id} item={x} active={active === String(x.id)} activeKind={activeKind} approve={() => decide(String(x.id), 'approve')} reject={() => confirmAction(x, 'Reject', () => decide(String(x.id), 'reject'))}/>) : <Empty text="No pending requests"/>}
    <Section title="CONFIRMED PLAYERS" count={`${confirmed.length} / ${detail.data?.max_players || '—'} confirmed`}/>{confirmed.length ? confirmed.map((x: any) => <View key={x.id || x.player_id} style={s.confirmed}><Avatar name={nameOf(x)}/><View style={s.identity}><Text style={s.name}>{nameOf(x)}</Text><Text style={s.playerId}>Player ID: {codeOf(x)}</Text></View><Text style={s.confirmedText}>✓ Confirmed</Text></View>) : <Empty text="Approved players will appear here"/>}
    <Section title="TEAM SETUP" count={`${teamRows.length} teams`}/>
    {!enough ? (
      <Status text={`Need ${min - confirmed.length} more player${min - confirmed.length === 1 ? '' : 's'} to start team setup`}/>
    ) : detail.data?.event_type !== 'DOUBLES' ? (
      <Status text="Singles fixtures do not require teams."/>
    ) : locked ? (
      <Status text="Pairing locked after fixtures were generated."/>
    ) : (
      <>
        <TeamsCard teamRows={teamRows} allPaired={unpaired.length === 0} onRemove={(team) => confirmAction(team, 'Remove', () => removeTeam.mutate(String(team.id)))}/>
        <UnpairedCard unpaired={unpaired} selected={selected} onToggle={(pid) => setSelected((a) => a.includes(pid) ? a.filter((v) => v !== pid) : a.length < 2 ? [...a, pid] : a)}/>
        <PillButton
          icon="＋"
          title="Create Team"
          sub="Select 2 players to create a team"
          disabled={selected.length !== 2 || addTeam.isPending}
          onPress={() => addTeam.mutate(selected as [string, string])}
        />
        <OutlineButton
          icon="⇄"
          title={shuffle.isPending ? 'Shuffling…' : 'Shuffle Remaining'}
          disabled={shuffle.isPending || !unpaired.length || unpaired.length % 2 !== 0}
          onPress={() => shuffle.mutate()}
        />
        {unpaired.length % 2 !== 0 && <Status text="Two players are required to create a doubles team."/>}
        <Status text={ready ? `✓ Pairing complete · ${teamRows.length} teams ready` : `${unpaired.length} players still need teams`}/>
      </>
    )}
    <Section title="FIXTURES" count={matches ? `${matches} matches` : undefined}/>
    {fixtures.data?.fixture ? (
      <>
        <Status text="✓ Fixtures generated"/>
        <GlowButton icon="▶" title="View Fixtures" sub="Check the match schedule" onPress={() => router.push({ pathname: '/(player)/friendly/fixtures', params: { id } })}/>
      </>
    ) : (
      <GlowButton
        icon="▶"
        title={generate.isPending ? 'Generating…' : 'Generate Fixtures'}
        sub="Create the match schedule"
        disabled={!ready || generate.isPending}
        onPress={() => generate.mutate()}
      />
    )}
  </ScrollView></ScreenContainer>;
}
function confirmAction(item: any, action: string, run: () => void) { Alert.alert(`${action} ${action === 'Remove' ? 'pair' : 'request'}?`, `${action} ${nameOf(item)}?`, [{ text: 'Cancel', style: 'cancel' }, { text: action, style: action === 'Reject' || action === 'Remove' ? 'destructive' : 'default', onPress: run }]); }
function Header() { return <View style={s.header}><BackButton variant="light"/><View style={s.brandCopy}><Text style={s.brand}>SMASHPOINT</Text><Text style={s.tagline}>PLAY · COMPETE · CONNECT</Text></View><View style={s.headerSpace}/></View>; }
function Section({ title, count }: { title: string; count?: string }) { return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{count && <Text style={s.sectionCount}>{count}</Text>}</View>; }
function Avatar({ name }: { name: string }) { return <View style={s.avatar}><Text style={s.initials}>{initials(name)}</Text></View>; }
function Loading() { return <View style={s.state}><ActivityIndicator color={colors.primary}/><Text style={s.muted}>Loading…</Text></View>; }
function Empty({ text }: { text: string }) { return <View style={s.empty}><Text style={s.muted}>{text}</Text></View>; }
function Status({ text }: { text: string }) { return <View style={s.statusCard}><Text style={s.statusText}>{text}</Text></View>; }
function RequestCard({ item, active, activeKind, approve, reject }: { item: any; active: boolean; activeKind: 'approve' | 'reject' | null; approve: () => void; reject: () => void }) { return <View style={s.card}><View style={s.identityRow}><Avatar name={nameOf(item)}/><View style={s.identity}><Text style={s.name}>{nameOf(item)}</Text><Text style={s.playerId}>Player ID: {codeOf(item)}</Text></View></View><View style={s.pending}><Text style={s.pendingText}>● Pending</Text></View><View style={s.actions}><Pressable disabled={active} onPress={approve} style={s.approve}><Text style={s.approveText}>{active && activeKind === 'approve' ? 'Approving…' : '✓  Approve'}</Text></Pressable><Pressable disabled={active} onPress={reject} style={s.reject}><Text style={s.rejectText}>{active && activeKind === 'reject' ? 'Rejecting…' : '✕  Reject'}</Text></Pressable></View></View>; }
function TeamsCard({ teamRows, allPaired, onRemove }: { teamRows: any[]; allPaired: boolean; onRemove: (team: any) => void }) {
  return (
    <View style={s.groupCard}>
      <View style={s.groupHeader}>
        <View style={s.groupHeaderLeft}>
          <TournamentIcon name="people" size={20} />
          <Text style={s.groupTitle}>Teams ({teamRows.length})</Text>
        </View>
        {allPaired && teamRows.length > 0 && (
          <View style={s.donePill}>
            <Text style={s.donePillText}>All players paired ✓</Text>
          </View>
        )}
      </View>
      {teamRows.length ? (
        teamRows.map((x: any) => (
          <View key={x.id} style={s.teamRow}>
            <View style={s.teamRowIcon}>
              <TournamentIcon name="people" size={18} />
            </View>
            <View style={s.teamRowCopy}>
              <Text style={s.teamRowTitle}>{x.team_code || 'Team'}</Text>
              <Text style={s.teamRowMembers}>
                {(x.members || []).map((m: any) => m.name || m.full_name).join(' · ') || 'No members'}
              </Text>
            </View>
            <Pressable onPress={() => onRemove(x)}>
              <Text style={s.teamRowRemove}>Remove</Text>
            </Pressable>
          </View>
        ))
      ) : (
        <View style={s.emptyDashed}>
          <View style={s.emptyDashedIcon}>
            <TournamentIcon name="people" size={26} />
          </View>
          <View style={s.emptyDashedCopy}>
            <Text style={s.emptyDashedTitle}>No teams formed yet</Text>
            <Text style={s.emptyDashedText}>Players will be grouped into teams during the draw.</Text>
          </View>
          <Text style={s.emptyDashedGlyph}>🏸</Text>
        </View>
      )}
    </View>
  );
}
function UnpairedCard({ unpaired, selected, onToggle }: { unpaired: any[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <View style={s.groupCard}>
      <View style={s.groupHeader}>
        <View style={s.groupHeaderLeft}>
          <TournamentIcon name="single" size={20} />
          <Text style={s.groupTitle}>Unpaired Players ({unpaired.length})</Text>
        </View>
      </View>
      {unpaired.length ? (
        unpaired.map((x: any) => {
          const pid = idOf(x);
          const on = selected.includes(pid);
          return (
            <Pressable key={pid} onPress={() => onToggle(pid)} style={[s.unpairedRow, on && s.unpairedRowSelected]}>
              <Text style={s.radio}>{on ? '●' : '○'}</Text>
              <View style={s.teamRowCopy}>
                <Text style={s.teamRowTitle}>{nameOf(x)}</Text>
                <Text style={s.teamRowMembers}>{codeOf(x)}</Text>
              </View>
            </Pressable>
          );
        })
      ) : (
        <View style={s.emptySolid}>
          <View style={s.emptySolidIcon}>
            <TournamentIcon name="check" size={20} />
          </View>
          <View style={s.emptyDashedCopy}>
            <Text style={s.emptyDashedTitle}>No unpaired players</Text>
            <Text style={s.emptyDashedText}>All {unpaired.length} players are in teams.</Text>
          </View>
        </View>
      )}
    </View>
  );
}
function PillButton({ icon, title, sub, disabled, onPress }: { icon: string; title: string; sub?: string; disabled?: boolean; onPress: () => void }) {
  return (
    <View>
      <Pressable disabled={disabled} onPress={onPress} style={[s.pillButton, disabled && s.pillButtonDisabled]}>
        <Text style={[s.pillButtonIcon, disabled && s.pillButtonIconDisabled]}>{icon}</Text>
        <Text style={[s.pillButtonText, disabled && s.pillButtonTextDisabled]}>{title}</Text>
      </Pressable>
      {sub ? <Text style={s.buttonSub}>{sub}</Text> : null}
    </View>
  );
}
function OutlineButton({ icon, title, disabled, onPress }: { icon: string; title: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[s.outlineButton, disabled && s.outlineButtonDisabled]}>
      <Text style={[s.outlineButtonIcon, disabled && s.outlineButtonTextDisabled]}>{icon}</Text>
      <Text style={[s.outlineButtonText, disabled && s.outlineButtonTextDisabled]}>{title}</Text>
    </Pressable>
  );
}
function GlowButton({ icon, title, sub, disabled, onPress }: { icon: string; title: string; sub?: string; disabled?: boolean; onPress: () => void }) {
  return (
    <View>
      <Pressable disabled={disabled} onPress={onPress} style={[s.glowButton, disabled && s.glowButtonDisabled]}>
        <Text style={[s.glowButtonIcon, disabled && s.glowButtonTextDisabled]}>{icon}</Text>
        <Text style={[s.glowButtonText, disabled && s.glowButtonTextDisabled]}>{title}</Text>
        <Text style={[s.glowButtonShuttle, disabled && s.glowButtonTextDisabled]}>🏸</Text>
      </Pressable>
      {sub ? <Text style={s.buttonSub}>{sub}</Text> : null}
    </View>
  );
}
const DARK_CARD = '#0C2E27';
const DARK_CARD_BORDER = '#164A3C';
const s = StyleSheet.create({ content: { paddingBottom: spacing.xl }, header: { flexDirection: 'row', alignItems: 'center', minHeight: 82 }, brandCopy: { flex: 1, alignItems: 'center' }, brand: { color: colors.primaryDark, fontSize: 15, fontWeight: '900', letterSpacing: 2 }, tagline: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1 }, headerSpace: { width: 44 }, title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: spacing.md }, subtitle: { color: colors.muted, lineHeight: 20, marginBottom: spacing.md }, section: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm }, sectionTitle: { color: colors.primaryDark, fontSize: 13, fontWeight: '900', letterSpacing: 1 }, sectionCount: { color: colors.muted, fontSize: 12, fontWeight: '800' }, card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.sm, ...shadows.card }, identityRow: { flexDirection: 'row', alignItems: 'center' }, identity: { flex: 1, marginLeft: spacing.md }, avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surfaceTint, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CBE4D5' }, initials: { color: colors.primaryDark, fontWeight: '900' }, name: { color: colors.text, fontSize: 16, fontWeight: '900' }, playerId: { color: colors.muted, fontSize: 11, marginTop: 4 }, pending: { alignSelf: 'flex-start', backgroundColor: '#FFF2DF', borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 5, marginTop: spacing.md }, pendingText: { color: '#9A640E', fontSize: 11, fontWeight: '900' }, actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }, approve: { flex: 1, minHeight: 46, borderRadius: radius.medium, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, reject: { flex: 1, minHeight: 46, borderRadius: radius.medium, backgroundColor: '#FFF5F4', borderWidth: 1, borderColor: '#E9A3A0', alignItems: 'center', justifyContent: 'center' }, approveText: { color: colors.white, fontWeight: '900' }, rejectText: { color: colors.error, fontWeight: '900' }, confirmed: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: '#BFE2C9', padding: spacing.md, marginBottom: spacing.sm }, confirmedText: { color: colors.success, fontSize: 11, fontWeight: '900' }, label: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: .8, marginTop: spacing.md, marginBottom: spacing.xs }, playerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border }, selected: { borderColor: colors.primary, backgroundColor: '#F0FAF2' }, radio: { color: colors.primary, fontSize: 20, width: 28 }, rowName: { color: colors.text, fontWeight: '800', flex: 1 }, rowCode: { color: colors.muted, fontSize: 10 }, team: { backgroundColor: '#F0FAF2', borderRadius: radius.md, borderWidth: 1, borderColor: '#BFE2C9', padding: spacing.md, marginBottom: spacing.sm }, teamTitle: { color: colors.primaryDark, fontWeight: '900' }, teamMember: { color: colors.text, fontWeight: '700', paddingTop: 4 }, remove: { color: colors.error, fontWeight: '900', marginTop: spacing.sm }, statusCard: { backgroundColor: '#F7FAF8', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: spacing.sm }, statusText: { color: colors.primaryDark, fontWeight: '800' }, state: { alignItems: 'center', padding: spacing.lg }, empty: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md }, muted: { color: colors.muted, lineHeight: 20 }, notice: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.xl, ...shadows.card }, noticeTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: spacing.sm },
  groupCard: { backgroundColor: DARK_CARD, borderRadius: radius.lg, borderWidth: 1, borderColor: DARK_CARD_BORDER, padding: spacing.lg, marginBottom: spacing.md },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, flexWrap: 'wrap', gap: spacing.sm },
  groupHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  groupTitle: { color: colors.white, fontSize: 19, fontWeight: '900' },
  donePill: { backgroundColor: 'rgba(138, 226, 52, 0.14)', borderWidth: 1, borderColor: 'rgba(138, 226, 52, 0.4)', borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  donePillText: { color: colors.lime, fontSize: 12, fontWeight: '900' },
  emptyDashed: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderStyle: 'dashed', borderColor: DARK_CARD_BORDER, borderRadius: radius.md, padding: spacing.md },
  emptyDashedIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(138, 226, 52, 0.1)', alignItems: 'center', justifyContent: 'center' },
  emptyDashedCopy: { flex: 1, minWidth: 0 },
  emptyDashedTitle: { color: colors.white, fontSize: 15, fontWeight: '900' },
  emptyDashedText: { color: '#8FB3A6', fontSize: 12, marginTop: 4, lineHeight: 17 },
  emptyDashedGlyph: { fontSize: 26, opacity: 0.5 },
  emptySolid: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: 'rgba(138, 226, 52, 0.08)', borderRadius: radius.md, padding: spacing.md },
  emptySolidIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  teamRowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(138, 226, 52, 0.12)', alignItems: 'center', justifyContent: 'center' },
  teamRowCopy: { flex: 1, minWidth: 0 },
  teamRowTitle: { color: colors.white, fontWeight: '900', fontSize: 14 },
  teamRowMembers: { color: '#8FB3A6', fontSize: 12, marginTop: 2 },
  teamRowRemove: { color: '#F49B98', fontWeight: '900', fontSize: 12 },
  unpairedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: 'transparent' },
  unpairedRowSelected: { borderColor: colors.lime, backgroundColor: 'rgba(138, 226, 52, 0.1)' },
  buttonSub: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 6, marginBottom: spacing.md },
  pillButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 54, borderRadius: radius.pill, backgroundColor: colors.primary },
  pillButtonDisabled: { backgroundColor: colors.disabled },
  pillButtonIcon: { color: colors.white, fontSize: 18, fontWeight: '900' },
  pillButtonIconDisabled: { color: '#7A8B85' },
  pillButtonText: { color: colors.white, fontSize: 15, fontWeight: '900' },
  pillButtonTextDisabled: { color: '#7A8B85' },
  outlineButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 54, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.primary, marginBottom: spacing.md },
  outlineButtonDisabled: { borderColor: colors.disabled },
  outlineButtonIcon: { color: colors.primary, fontSize: 16, fontWeight: '900' },
  outlineButtonText: { color: colors.primary, fontSize: 15, fontWeight: '900' },
  outlineButtonTextDisabled: { color: colors.disabled },
  glowButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 58, borderRadius: radius.pill, backgroundColor: colors.lime, shadowColor: colors.lime, shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  glowButtonDisabled: { backgroundColor: colors.disabled, shadowOpacity: 0 },
  glowButtonIcon: { color: colors.primaryDark, fontSize: 15 },
  glowButtonText: { color: colors.primaryDark, fontSize: 16, fontWeight: '900' },
  glowButtonShuttle: { fontSize: 18 },
  glowButtonTextDisabled: { color: '#7A8B85' },
});
