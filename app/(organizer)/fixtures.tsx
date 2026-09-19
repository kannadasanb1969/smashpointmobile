import { RefreshControl, ScrollView, StyleSheet, Text, Pressable, View, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { PrimaryButton } from '../../src/components/common/PrimaryButton';
import { ops } from '../../src/features/organizer/operations';
import {
  groupFixtures,
  matchParticipant,
  roundLabel,
} from '../../src/features/organizer/fixtureHelpers';
import { useTournament } from '../../src/features/player/api';
import { useAuthStore } from '../../src/store/authStore';
import { colors, radius, shadows, spacing } from '../../src/theme';
import { useState } from 'react';

export default function Fixtures() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<'BRACKET' | 'MATCHES'>('BRACKET');
  const [categoryId, setCategoryId] = useState('');
  const me = useAuthStore((s) => s.user?.id) || '';
  const tournament = useTournament(id);
  const client = useQueryClient();
  const queryKey = ['organizer-fixtures', id, categoryId];
  const query = useQuery({
    queryKey,
    queryFn: () => ops.fixtures(String(id), categoryId || undefined).then((r) => r.data),
    enabled: Boolean(id),
  });
  const fixtures = Array.isArray(query.data) ? query.data : [];
  const matches = fixtures.flatMap((fixture: any) =>
    (fixture.matches || []).map((match: any) => ({
      ...match,
      fixtureId: fixture.id,
      participants: fixture.participants || [],
    })),
  );
  const rounds = groupFixtures(matches as any);
  const category = (tournament.data?.categories || []).find(
    (c: any) => String(c.id) === categoryId,
  );
  const draftFixture = fixtures.find((f: any) => f.status === 'DRAFT');
  const generate = useMutation({
    mutationFn: () =>
      ops.generate(String(id), categoryId, tournament.data?.format || 'KNOCKOUT', me),
    onSuccess: () =>
      Promise.all([query.refetch(), client.invalidateQueries({ queryKey })]),
    onError: (e: any) =>
      Alert.alert('Unable to generate fixture', e?.message || 'Please try again.'),
  });
  const publish = useMutation({
    mutationFn: () => ops.publishFixture(String(draftFixture?.id)),
    onSuccess: () =>
      Promise.all([query.refetch(), client.invalidateQueries({ queryKey })]),
    onError: (e: any) =>
      Alert.alert('Unable to publish fixture', e?.message || 'Please try again.'),
  });
  return (
    <ScreenContainer dark>
      <ScrollView
        refreshControl={
          <RefreshControl
            tintColor={colors.lime}
            refreshing={query.isFetching}
            onRefresh={() => query.refetch()}
          />
        }
        contentContainerStyle={s.page}
      >
        <Text onPress={() => router.back()} style={s.back}>
          ‹ Back to tournament
        </Text>
        <Text style={s.eyebrow}>ORGANIZER FIXTURES</Text>
        <Text style={s.title}>Fixture - Knockout</Text>
        <Text style={s.subtitle}>{tournament.data?.name || 'Tournament'}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.categoryRow}
        >
          {(tournament.data?.categories || []).map((c: any) => (
            <Pressable
              key={c.id}
              onPress={() => setCategoryId(String(c.id))}
              style={[s.category, categoryId === String(c.id) && s.categoryActive]}
            >
              <Text style={[s.categoryText, categoryId === String(c.id) && s.categoryTextActive]}>
                {c.name || c.eventType}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={s.tabs}>
          <Pressable
            onPress={() => setTab('BRACKET')}
            style={[s.tab, tab === 'BRACKET' && s.tabActive]}
          >
            <Text style={s.tabText}>Bracket</Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('MATCHES')}
            style={[s.tab, tab === 'MATCHES' && s.tabActive]}
          >
            <Text style={s.tabText}>Matches</Text>
          </Pressable>
        </View>
        {query.isLoading && <Text style={s.muted}>Loading fixtures…</Text>}
        {query.isError && (
          <Text onPress={() => query.refetch()} style={s.error}>
            Unable to load fixtures. Tap to retry.
          </Text>
        )}
        {!query.isLoading && !query.isError && !matches.length && (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No fixtures generated</Text>
            <Text style={s.muted}>
              {categoryId
                ? `Generate a fixture for ${category?.name || category?.eventType || 'this category'} to see the knockout draw.`
                : 'Select a category above, then generate its fixture.'}
            </Text>
            {categoryId && tournament.data?.status === 'PUBLISHED' && (
              <PrimaryButton
                disabled={generate.isPending}
                title={generate.isPending ? 'Generating…' : 'Generate Fixture'}
                onPress={() => {
                  if (generate.isPending) return;
                  Alert.alert(
                    'Generate fixture?',
                    'This creates the bracket for the selected category from its active registrations.',
                    [
                      { text: 'Cancel' },
                      { text: 'Generate', onPress: () => generate.mutate() },
                    ],
                  );
                }}
              />
            )}
          </View>
        )}
        {draftFixture && (
          <PrimaryButton
            disabled={publish.isPending}
            title={publish.isPending ? 'Publishing…' : 'Publish Fixture'}
            onPress={() => {
              if (publish.isPending) return;
              Alert.alert(
                'Publish fixture?',
                'Once published, players can see the draw and matches can be started.',
                [{ text: 'Cancel' }, { text: 'Publish', onPress: () => publish.mutate() }],
              );
            }}
          />
        )}
        {tab === 'BRACKET' && matches.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={s.bracket}>
            {rounds.map((round: any) => (
              <View key={round.round} style={s.roundColumn}>
                <Text style={s.roundTitle}>{roundLabel(round.round)}</Text>
                <Text style={s.roundCount}>{round.fixtures.length} matches</Text>
                {round.fixtures.map((m: any) => (
                  <View key={m.id} style={s.node}>
                    <View style={s.nodeTop}>
                      <Text style={s.code}>
                        {m.matchCode || m.match_code || `M${m.matchNumber}`}
                      </Text>
                      <Text style={s.nodeStatus}>{m.status || 'SCHEDULED'}</Text>
                    </View>
                    <Text style={s.participant}>{matchParticipant(m, 1)}</Text>
                    <Text style={s.vs}>VS</Text>
                    <Text style={s.participant}>{matchParticipant(m, 2)}</Text>
                    <View style={s.connector} />
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
        {tab === 'MATCHES' &&
          matches.map((m: any, index: number) => (
            <Pressable
              key={m.id}
              disabled={Boolean(m.isAutoAdvanced || m.is_auto_advanced)}
              style={s.matchCard}
              onPress={() =>
                router.push({ pathname: '/(organizer)/matches/[id]', params: { id: String(m.id) } })
              }
            >
              <View style={s.matchTop}>
                <Text style={s.matchCode}>
                  {m.matchCode || m.match_code || `Match ${index + 1}`}
                </Text>
                <Text style={s.status}>
                  {m.isAutoAdvanced || m.is_auto_advanced
                    ? 'AUTO-ADVANCED'
                    : m.status || 'SCHEDULED'}
                </Text>
              </View>
              <Text style={s.matchRound}>
                {roundLabel(m.roundName || m.round_number || m.round)}
              </Text>
              <Text style={s.matchName}>
                {matchParticipant(m, 1)} · {m.participant1Score ?? m.participant1_score ?? 0}
              </Text>
              <Text style={s.matchName}>
                {matchParticipant(m, 2)} · {m.participant2Score ?? m.participant2_score ?? 0}
              </Text>
              <Text style={s.action}>
                {m.isAutoAdvanced || m.is_auto_advanced
                  ? 'Advances by bye'
                  : m.status === 'LIVE'
                    ? 'Score Match  →'
                    : m.status === 'COMPLETED'
                      ? 'View Match  →'
                      : 'Start Match  →'}
              </Text>
            </Pressable>
          ))}
      </ScrollView>
    </ScreenContainer>
  );
}
const s = StyleSheet.create({
  page: { paddingBottom: 50 },
  back: { color: colors.lime, fontWeight: '900', marginTop: spacing.md },
  eyebrow: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginTop: spacing.lg,
  },
  title: { color: colors.white, fontSize: 29, fontWeight: '900', marginTop: spacing.sm },
  subtitle: { color: '#A8B6B1', marginTop: 6 },
  categoryRow: { gap: 8, paddingVertical: spacing.lg },
  category: {
    borderWidth: 1,
    borderColor: '#18553F',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  categoryText: { color: '#C6DDD1', fontWeight: '800', fontSize: 12 },
  categoryTextActive: { color: colors.primaryDark },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  tab: {
    backgroundColor: '#082B24',
    borderColor: '#18553F',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  tabActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  tabText: { color: colors.white, fontWeight: '900' },
  bracket: { gap: 20, paddingVertical: 8, paddingRight: 20 },
  roundColumn: { width: 210 },
  roundTitle: { color: colors.lime, fontWeight: '900', fontSize: 15 },
  roundCount: { color: '#A8B6B1', fontSize: 11, marginTop: 3, marginBottom: 12 },
  node: {
    backgroundColor: '#F5F8F7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C9DAD2',
    padding: 12,
    marginBottom: 22,
    minHeight: 106,
    ...shadows.card,
  },
  nodeTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  code: { color: '#526575', fontSize: 10, fontWeight: '900' },
  nodeStatus: { color: '#9B650B', fontSize: 9, fontWeight: '900' },
  participant: { color: '#15231F', fontSize: 14, fontWeight: '800' },
  vs: { color: '#8A9892', fontSize: 9, fontWeight: '900', marginVertical: 3 },
  connector: {
    position: 'absolute',
    right: -20,
    top: '50%',
    width: 20,
    height: 1,
    backgroundColor: colors.lime,
  },
  matchCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  matchTop: { flexDirection: 'row', justifyContent: 'space-between' },
  matchCode: { color: colors.text, fontWeight: '900' },
  status: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  matchRound: { color: colors.muted, fontSize: 11, marginVertical: 8 },
  matchName: { color: colors.text, fontSize: 16, fontWeight: '800', paddingVertical: 5 },
  action: { color: colors.primary, fontWeight: '900', marginTop: 10 },
  empty: {
    backgroundColor: '#06251F',
    borderWidth: 1,
    borderColor: '#0D6049',
    borderRadius: 16,
    padding: 22,
  },
  emptyTitle: { color: colors.white, fontSize: 17, fontWeight: '900', marginBottom: 7 },
  muted: { color: '#A8B6B1', lineHeight: 20 },
  error: { color: '#FF9B9B', padding: 20 },
});
