import { ActivityIndicator, Alert, ImageBackground, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../src/store/authStore';
import { ScreenContainer } from '../../../src/components/common/ScreenContainer';
import { PrimaryButton } from '../../../src/components/common/PrimaryButton';
import { BackButton } from '../../../src/components/common/BackButton';
import { TournamentIcon, type TournamentIconName } from '../../../src/components/common/TournamentIcon';
import { colors, radius, spacing } from '../../../src/theme';
import { friendlyApi, friendlyKeys, friendlyIsOwner, friendlyPairingReady, friendlyPairingLocked, friendlyStatusLabel, useFriendlyDetail, useFriendlyParticipants, useFriendlyJoin, friendlyLifecycleApi } from '../../../src/features/player/friendly';

const nameOf = (x: any) => x.full_name || x.fullName || x.name || x.playerName || 'Player details unavailable';
const idOf = (x: any) => String(x.player_id || x.id);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase() || 'P';

export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const me = useAuthStore((s) => s.user?.playerProfile?.id || s.user?.id) || ''; const client = useQueryClient();
  const detail = useFriendlyDetail(id); const participants = useFriendlyParticipants(id); const [selected, setSelected] = useState<string[]>([]);
  const teams = useQuery({ queryKey: friendlyKeys.teams(id), queryFn: () => friendlyApi.teams(id), enabled: !!id }); const fixtures = useQuery({ queryKey: friendlyKeys.fixtures(id), queryFn: () => friendlyApi.fixtures(id), enabled: !!id }); const result = useQuery({ queryKey: friendlyKeys.result(id), queryFn: () => friendlyLifecycleApi.result(id), enabled: !!id });
  const owner = friendlyIsOwner(detail.data, me); const join = useFriendlyJoin(id); const players = (participants.data || []) as any[]; const teamRows = (teams.data || []) as any[]; const assigned = new Set(teamRows.flatMap((t) => (t.members || []).map(idOf))); const unpaired = players.filter((p) => !assigned.has(idOf(p))); const matches = fixtures.data?.matches || []; const locked = friendlyPairingLocked(fixtures.data); const ready = friendlyPairingReady(detail.data, players, teamRows); const hasFixtures = Boolean(fixtures.data?.fixture || fixtures.data?.id || matches.length);
  const addTeam = useMutation({ mutationFn: (ids: [string, string]) => friendlyApi.addTeam({ id, playerIds: ids }), onSuccess: () => { setSelected([]); void Promise.all([teams.refetch(), participants.refetch(), detail.refetch()]); }, onError: (e: any) => Alert.alert('Unable to create team', e?.message || 'Please try again.') });
  const shuffle = useMutation({ mutationFn: () => friendlyApi.shuffle(id), onSuccess: () => void Promise.all([teams.refetch(), participants.refetch()]), onError: (e: any) => Alert.alert('Unable to shuffle remaining players', e?.message || 'Please try again.') });
  const remove = useMutation({ mutationFn: (teamId: string) => friendlyApi.deleteTeam({ id, teamId }), onSuccess: () => void Promise.all([teams.refetch(), participants.refetch()]), onError: (e: any) => Alert.alert('Unable to remove team', e?.message || 'Please try again.') });
  const generate = useMutation({ mutationFn: () => friendlyApi.generateFixtures(id), onSuccess: () => void Promise.all([fixtures.refetch(), detail.refetch(), client.invalidateQueries({ queryKey: friendlyKeys.all })]), onError: (e: any) => Alert.alert('Unable to generate fixtures', e?.message || 'Please try again.') });
  const refresh = () => void Promise.all([detail.refetch(), participants.refetch(), teams.refetch(), fixtures.refetch(), result.refetch()]);
  if (detail.isLoading) return <ScreenContainer dark><View style={s.center}><ActivityIndicator color={colors.lime}/><Text style={s.muted}>Loading friendly match…</Text></View></ScreenContainer>;
  if (detail.isError || !detail.data) return <ScreenContainer dark><View style={s.center}><Text style={s.title}>Friendly Match unavailable.</Text><PrimaryButton title="Retry" onPress={() => detail.refetch()}/></View></ScreenContainer>;
  const match = detail.data; const isParticipant = players.some((p) => idOf(p) === String(me));
  return <ScreenContainer dark><ScrollView showsVerticalScrollIndicator={false} style={s.scroll} contentContainerStyle={s.content} refreshControl={<RefreshControl tintColor={colors.lime} refreshing={detail.isFetching || participants.isFetching || teams.isFetching || fixtures.isFetching} onRefresh={refresh}/> }>
    <ImageBackground source={require('../../../assets/images/login-badminton-bg.png')} style={s.hero} imageStyle={s.heroImage}>
      <View style={s.heroOverlay} />
      <View style={s.heroTopRow}>
        <BackButton variant="dark" fallbackRoute="/(player)/friendly" />
        <Pressable accessibilityLabel="Friendly match menu" style={s.menuButton} onPress={() => Alert.alert('Friendly Match', 'Use the actions on this screen to manage the match.')}>
          <TournamentIcon name="menu" size={16} />
        </Pressable>
      </View>
      <View style={s.heroBody}>
        <View style={s.badgeRow}>
          <View style={s.eyebrowPill}><Text style={s.eyebrow}>FRIENDLY MATCH TEST123</Text></View>
          <View style={s.typePill}><Text style={s.typePillText}>{match.event_type}</Text></View>
        </View>
        <Text style={s.title}>{match.title}</Text>
        <Text style={s.meta}>{match.event_type} · {match.format} · <Text style={s.active}>● {friendlyStatusLabel(match.status)}</Text></Text>
      </View>
      <View style={s.heroFade} />
    </ImageBackground>

    <View style={s.body}>
      <View style={s.summary}>
        <Stat icon="people" value={players.length} label="Players" />
        <Stat icon="bracket" value={teamRows.length} label="Teams" />
        <Stat icon="trophy" value={matches.length} label="Fixtures" />
        <Stat icon="check" value={friendlyStatusLabel(match.status)} label="Status" isText />
      </View>

      <View style={s.quickRow}>
        <Quick icon="bars" title="View Fixtures" sub="Check upcoming matches" onPress={() => router.push({ pathname: '/(player)/friendly/fixtures', params: { id } })} />
        <Quick icon="clock" title="View Results" sub="See match results" onPress={() => router.push({ pathname: '/(player)/friendly/results', params: { id } })} />
      </View>

      <View style={s.actionsGroup}>
        {owner && match.status === 'OPEN' && <PrimaryButton title="Review Join Requests" onPress={() => router.push({ pathname: '/(player)/friendly/requests', params: { id } })}/>}
        {!owner && !isParticipant && match.status === 'OPEN' && <PrimaryButton disabled={join.isPending} title={join.isPending ? 'Requesting…' : 'Request to Join'} onPress={() => join.mutate(undefined, { onSuccess: () => Alert.alert('Request sent', 'The host will review your request.'), onError: (e: any) => Alert.alert('Unable to join', e?.message || 'Please try again.') })}/>}
        {owner && !isParticipant && match.status === 'OPEN' && <PrimaryButton disabled={join.isPending} title={join.isPending ? 'Joining…' : '🏸  Join as Player'} onPress={() => join.mutate(undefined, { onSuccess: () => Alert.alert("You're in!", 'You have been added as a player in your own match.'), onError: (e: any) => Alert.alert('Unable to join', e?.message || 'Please try again.') })}/>}
        {owner && isParticipant && (
          <View style={s.playingPill}>
            <Text style={s.playingPillText}>🏸 Playing in this match</Text>
          </View>
        )}
      </View>

      <View style={s.section}>
        <View style={s.sectionHeadingRow}>
          <TournamentIcon name="people" size={18} />
          <Text style={s.heading}>Teams ({teamRows.length})</Text>
        </View>
        <View style={s.statusPill}>
          <Text style={s.statusPillText}>{unpaired.length ? `${unpaired.length} unpaired` : 'All players paired ✓'}</Text>
        </View>
      </View>
      {teamRows.length ? (
        <View style={s.grid}>
          {teamRows.map((team, i) => (
            <View key={team.id} style={s.team}>
              <View style={s.teamTop}>
                <Text style={s.teamTitle}>{team.team_code || `Team ${i + 1}`}</Text>
                {owner && !locked && (
                  <Pressable onPress={() => Alert.alert('Remove team?', 'This returns the players to Unpaired Players.', [{ text: 'Cancel' }, { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(String(team.id)) }])}>
                    <TournamentIcon name="menu" size={14} />
                  </Pressable>
                )}
              </View>
              {(team.members || []).map((m: any) => (
                <View key={idOf(m)} style={s.member}>
                  <View style={s.avatar}><Text style={s.initials}>{initials(nameOf(m))}</Text></View>
                  <Text style={s.memberName}>{nameOf(m)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : (
        <View style={s.emptyCard}>
          <View style={s.emptyIcon}><TournamentIcon name="people" size={20} /></View>
          <View style={s.emptyCopy}>
            <Text style={s.emptyTitle}>No teams formed yet</Text>
            <Text style={s.emptyText}>Players will be grouped into teams during the draw.</Text>
          </View>
        </View>
      )}

      <View style={s.section}>
        <View style={s.sectionHeadingRow}>
          <TournamentIcon name="single" size={18} />
          <Text style={s.heading}>Unpaired Players ({unpaired.length})</Text>
        </View>
      </View>
      {unpaired.length ? (
        unpaired.map((p) => {
          const on = selected.includes(idOf(p));
          return (
            <Pressable
              key={idOf(p)}
              disabled={locked}
              onPress={() => setSelected((a) => (on ? a.filter((x) => x !== idOf(p)) : a.length < 2 ? [...a, idOf(p)] : a))}
              style={[s.playerRow, on && s.playerRowSelected]}
            >
              <View style={s.playerAvatar}>{on ? <TournamentIcon name="check" size={14} /> : <TournamentIcon name="single" size={14} />}</View>
              <Text style={s.playerName}>{nameOf(p)}</Text>
              <Text style={s.playerChevron}>›</Text>
            </Pressable>
          );
        })
      ) : (
        <View style={s.emptyCard}>
          <View style={s.emptyIcon}><TournamentIcon name="check" size={20} /></View>
          <View style={s.emptyCopy}>
            <Text style={s.emptyTitle}>No unpaired players</Text>
            <Text style={s.emptyText}>All {players.length} players are in teams.</Text>
          </View>
        </View>
      )}

      {owner && match.event_type === 'DOUBLES' && !locked && (
        <>
          <PrimaryButton disabled={selected.length !== 2 || addTeam.isPending} title={addTeam.isPending ? 'Creating Team…' : 'Create Team'} onPress={() => selected.length === 2 && addTeam.mutate(selected as [string, string])} />
          <Text style={s.helper}>Select 2 players to create a team</Text>
          <PrimaryButton disabled={!unpaired.length || unpaired.length % 2 !== 0 || shuffle.isPending} title={shuffle.isPending ? 'Shuffling…' : 'Shuffle Remaining'} onPress={() => shuffle.mutate()} />
        </>
      )}
      {owner && !hasFixtures && (
        <>
          <Pressable disabled={!ready || generate.isPending} onPress={() => generate.mutate()} style={[s.generateButton, (!ready || generate.isPending) && s.disabled]}>
            <TournamentIcon name="play" size={16} />
            <Text style={s.generateText}>{generate.isPending ? 'Generating Fixtures…' : 'Generate Fixtures'}</Text>
          </Pressable>
          <Text style={s.helper}>Create the match schedule</Text>
        </>
      )}
      {hasFixtures && (
        <View style={s.banner}>
          <View style={s.bannerIcon}><TournamentIcon name="check" size={20} /></View>
          <View style={s.bannerCopy}>
            <Text style={s.bannerTitle}>Fixtures Generated</Text>
            <Text style={s.bannerText}>{matches.length} fixture{matches.length === 1 ? '' : 's'} are ready to play.</Text>
          </View>
        </View>
      )}
    </View>

    <View style={s.footer}>
      <Text style={s.footerBrand}>Smash<Text style={s.footerLime}>Point</Text></Text>
      <Text style={s.footerTagline}>More Than a Game</Text>
    </View>
  </ScrollView></ScreenContainer>;
}
function Stat({ icon, value, label, isText }: { icon: TournamentIconName; value: number | string; label: string; isText?: boolean }) {
  return (
    <View style={s.stat}>
      <TournamentIcon name={icon} size={18} />
      <Text style={[s.statValue, isText && s.statValueText]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}
function Quick({ icon, title, sub, onPress }: { icon: TournamentIconName; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.quick}>
      <TournamentIcon name={icon} size={20} />
      <View style={s.quickCopy}>
        <Text style={s.quickTitle}>{title}</Text>
        <Text style={s.quickSub}>{sub}</Text>
      </View>
      <Text style={s.chevron}>›</Text>
    </Pressable>
  );
}
const s = StyleSheet.create({
  scroll: { backgroundColor: '#031A16' },
  content: { paddingBottom: spacing.xl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  hero: { minHeight: 170, paddingTop: 8 },
  heroImage: { resizeMode: 'cover' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2, 27, 21, 0.6)' },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: -1, height: 26, backgroundColor: '#031A16' },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 6 },
  menuButton: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#2E6C56', backgroundColor: 'rgba(6, 45, 36, 0.7)', alignItems: 'center', justifyContent: 'center' },
  heroBody: { paddingHorizontal: 20, marginTop: 10 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  eyebrowPill: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.lime, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  typePill: { alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.lime, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: 'magenta' },
  typePillText: { color: colors.lime, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  actionsGroup: { gap: spacing.md },
  playingPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(138, 226, 52, 0.12)', borderWidth: 1, borderColor: 'rgba(138, 226, 52, 0.4)', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  playingPillText: { color: colors.lime, fontWeight: '900', fontSize: 13 },
  eyebrow: { color: colors.lime, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.white, fontSize: 24, fontWeight: '900', lineHeight: 29 },
  meta: { color: '#C6DDD1', fontSize: 12, fontWeight: '700', marginTop: 8 },
  active: { color: colors.lime, fontWeight: '900' },
  body: { paddingHorizontal: 20 },
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(6, 45, 36, 0.9)',
    borderColor: '#17614B',
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginTop: 16,
  },
  stat: { width: '25%', alignItems: 'center', paddingVertical: 8, gap: 6 },
  statValue: { color: colors.white, fontSize: 20, fontWeight: '900' },
  statValueText: { fontSize: 13 },
  statLabel: { color: '#8FA59B', fontSize: 10, fontWeight: '700' },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: spacing.sm },
  quick: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 45, 36, 0.9)',
    borderColor: '#17614B',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 8,
  },
  quickCopy: { flex: 1 },
  quickTitle: { color: colors.white, fontSize: 13, fontWeight: '900' },
  quickSub: { color: '#8FA59B', fontSize: 10, marginTop: 3 },
  chevron: { color: colors.lime, fontSize: 20, fontWeight: '900' },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 26, marginBottom: 12 },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  heading: { color: colors.white, fontSize: 19, fontWeight: '900', letterSpacing: 0.1 },
  statusPill: { borderWidth: 1, borderColor: '#2B8F67', backgroundColor: 'rgba(20, 120, 77, 0.2)', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  statusPillText: { color: colors.lime, fontSize: 11, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  team: { width: '48%', minWidth: 145, backgroundColor: 'rgba(11, 63, 48, 0.92)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#1B7254', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  teamTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamTitle: { color: colors.white, fontWeight: '900', fontSize: 13 },
  member: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(138, 226, 52, 0.16)', alignItems: 'center', justifyContent: 'center', marginRight: spacing.xs },
  initials: { color: colors.lime, fontSize: 10, fontWeight: '900' },
  memberName: { color: '#D4E9DF', fontSize: 12, fontWeight: '700', flex: 1 },
  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: 'rgba(8, 54, 42, 0.95)', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#237B5D', overflow: 'hidden' },
  emptyIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(138, 226, 52, 0.14)', borderWidth: 1, borderColor: 'rgba(138, 226, 52, 0.35)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  emptyCopy: { flex: 1 },
  emptyTitle: { color: colors.white, fontSize: 15, fontWeight: '900' },
  emptyText: { color: '#A7C8B9', fontSize: 12, lineHeight: 18, marginTop: 3 },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(239, 246, 241, 0.98)',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  playerRowSelected: { borderColor: colors.lime, backgroundColor: '#DDF4E6', transform: [{ scale: 1.01 }] },
  playerAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(15, 122, 79, 0.12)', alignItems: 'center', justifyContent: 'center' },
  playerName: { flex: 1, color: '#12211B', fontSize: 14, fontWeight: '800' },
  playerChevron: { color: '#5C776C', fontSize: 18, fontWeight: '900' },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 60,
    borderRadius: 20,
    backgroundColor: colors.lime,
    borderWidth: 1,
    borderColor: '#B6FF62',
    marginTop: spacing.md,
    shadowColor: colors.lime,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  disabled: { opacity: 0.4 },
  generateText: { color: '#06261A', fontSize: 16, fontWeight: '900' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: '#EFF6F1', borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md },
  bannerIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  bannerCopy: { flex: 1 },
  bannerTitle: { color: colors.success, fontSize: 14, fontWeight: '900' },
  bannerText: { color: '#5C776C', fontSize: 12, marginTop: 2 },
  helper: { color: '#A7C8B9', fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 10 },
  muted: { color: '#A8B6B1', lineHeight: 20 },
  footer: { alignItems: 'center', paddingTop: 36, paddingBottom: 16 },
  footerBrand: { color: colors.white, fontSize: 20, fontWeight: '900' },
  footerLime: { color: colors.lime },
  footerTagline: { color: '#8FA59B', fontSize: 12, marginTop: 4 },
});
