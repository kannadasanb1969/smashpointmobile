export const publishAllowed = (status: string) => status === 'APPROVED';
export type RegistrationLike = {
  categoryId?: string;
  eventType?: string;
  partnerId?: string | null;
  partnerType?: string;
  partner?: { id?: string; type?: string } | null;
};
export type FixtureLike = {
  id: string;
  categoryId?: string;
  status?: string;
  published?: boolean;
  round?: string | number;
  roundNumber?: number;
  roundName?: string;
  matchNumber?: number;
  matchOrder?: number;
  player1?: unknown;
  player2?: unknown;
  team1?: unknown;
  team2?: unknown;
  format?: string;
};
export const filterRegistrations = (items: RegistrationLike[] = [], categoryId?: string) =>
  !categoryId ? items : items.filter((x) => String(x.categoryId) === String(categoryId));
export const fixtureLabel = (value: unknown): string => {
  if (value == null || value === '') return 'TBD';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const x = value as Record<string, unknown>;
    if (x.isBye === true || x.status === 'BYE' || x.type === 'BYE') return 'BYE';
    return String(x.name || x.fullName || x.displayName || 'TBD');
  }
  return 'TBD';
};
export const participantDisplay = (value: unknown) => fixtureLabel(value);
export const fixtureIsPublished = (x: FixtureLike) =>
  x.published === true || x.status === 'PUBLISHED';
export const visibleFixtures = (items: FixtureLike[] = [], categoryId?: string) =>
  filterFixtures(items, categoryId).filter(fixtureIsPublished);
export const filterFixtures = (items: FixtureLike[] = [], categoryId?: string) =>
  !categoryId ? items : items.filter((x) => String(x.categoryId) === String(categoryId));
export const groupFixtures = (items: FixtureLike[]) => {
  const groups = new Map<string, FixtureLike[]>();
  items.forEach((x) => {
    const key = String(x.roundName ?? x.roundNumber ?? x.round ?? 'Fixtures');
    const list = groups.get(key) || [];
    list.push(x);
    groups.set(key, list);
  });
  return [...groups.entries()].map(([round, fixtures]) => ({
    round,
    fixtures: fixtures.sort(
      (a, b) => (a.matchNumber ?? a.matchOrder ?? 0) - (b.matchNumber ?? b.matchOrder ?? 0),
    ),
  }));
};
// Tournament match rows only carry participant1Id/participant2Id (see src/repositories/fixture.repository.js
// insertMatch) — there is no participant{side}Name field on the match itself. The real display name lives on
// the parent fixture's `participants` array (fixture_participants.displayName), keyed by participant id, so it
// must be resolved by lookup rather than read directly off the match — matching resolveFriendlySide's approach
// for friendly matches.
export const matchParticipant = (match: any, side: 1 | 2, participants: any[] = []): string => {
  const direct =
    match?.[`participant${side}Name`] ??
    match?.[`participant${side}_name`] ??
    match?.[`player${side}Name`] ??
    match?.[`team${side}Name`];
  if (direct) return fixtureLabel(direct);
  const id = match?.[`participant${side}Id`] ?? match?.[`participant${side}_id`];
  if (id == null) return fixtureLabel(match?.[`participant${side}`]);
  const list = participants.length ? participants : match?.participants || [];
  const found = list.find((p: any) => String(p.participantId ?? p.participant_id) === String(id));
  return fixtureLabel(found?.displayName ?? found?.display_name ?? match?.[`participant${side}`]);
};
// Quarter/Semi/Final naming only makes sense for a KNOCKOUT bracket. A LEAGUE (round-robin) fixture
// has no such stages — round 2 of a 15-round round-robin is just "Round 2", not "Quarter Final" — so
// callers must pass the fixture's actual format; omitting it keeps the old KNOCKOUT-shaped behavior.
export const roundLabel = (value: unknown, format?: string): string => {
  const raw = String(value ?? '').replace(/_/g, ' ');
  const num = /^ROUND (\d+)$/i.test(raw) ? raw.match(/\d+/)?.[0] : /^\d+$/.test(raw) ? raw : null;
  if (format === 'LEAGUE' || format === 'ROUND_ROBIN') return num ? `Round ${num}` : raw || 'Fixtures';
  if (/^ROUND 1$/i.test(raw) || raw === '1') return 'Round 1';
  if (/^ROUND 2$/i.test(raw) || raw === '2') return 'Quarter Final';
  if (/^ROUND 3$/i.test(raw) || raw === '3') return 'Semi Final';
  if (/^ROUND 4$/i.test(raw) || raw === '4') return 'Final';
  return raw || 'Fixtures';
};
// Deterministic standings from completed matches: 2 points per win, 0 per loss, ranked by points then
// point-difference then points-for. No such ranking rule exists elsewhere in the project (Friendly Match
// standings only track Played/Won/Lost and flag ties rather than resolving them), so this mirrors the
// same fresh rule computed server-side in fixture.service.js's computePoolStandings — kept identical here
// only so the Standings tab can render instantly from the already-fetched fixture payload.
export type StandingRow = {
  participantId: string; played: number; won: number; lost: number;
  pointsFor: number; pointsAgainst: number; pointDiff: number; points: number;
};
export const computeStandings = (matches: any[], participants: any[]): StandingRow[] => {
  const rows = new Map<string, StandingRow>();
  for (const p of participants) {
    const id = String(p.participantId ?? p.participant_id ?? p.id);
    rows.set(id, { participantId: id, played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0, pointDiff: 0, points: 0 });
  }
  for (const m of matches) {
    if (String(m.status).toUpperCase() !== 'COMPLETED') continue;
    const p1 = String(m.participant1Id ?? m.participant1_id ?? '');
    const p2 = String(m.participant2Id ?? m.participant2_id ?? '');
    const winner = String(m.winnerId ?? m.winner_id ?? '');
    const s1 = Number(m.participant1Score ?? m.participant1_score ?? 0);
    const s2 = Number(m.participant2Score ?? m.participant2_score ?? 0);
    if (!p1 || !p2 || !rows.has(p1) || !rows.has(p2)) continue;
    const r1 = rows.get(p1)!, r2 = rows.get(p2)!;
    r1.played += 1; r2.played += 1;
    r1.pointsFor += s1; r1.pointsAgainst += s2;
    r2.pointsFor += s2; r2.pointsAgainst += s1;
    if (winner === p1) { r1.won += 1; r1.points += 2; r2.lost += 1; }
    else if (winner === p2) { r2.won += 1; r2.points += 2; r1.lost += 1; }
  }
  const out = [...rows.values()];
  for (const r of out) r.pointDiff = r.pointsFor - r.pointsAgainst;
  return out.sort((a, b) => b.points - a.points || b.pointDiff - a.pointDiff || b.pointsFor - a.pointsFor);
};
export type PoolLike = { id: string; name: string; poolOrder?: number; pool_order?: number };
// Groups a fixture's matches/participants by pool (Pool -> Round -> matches), the middle level reusing
// groupFixtures per pool so Matches keeps its existing Pool->Round->MatchCard hierarchy.
export const groupByPool = (matches: FixtureLike[], participants: any[], pools: PoolLike[]) => {
  const sortedPools = [...pools].sort((a, b) => (a.poolOrder ?? a.pool_order ?? 0) - (b.poolOrder ?? b.pool_order ?? 0));
  return sortedPools.map((pool) => {
    const poolMatches = matches.filter((m: any) => String(m.poolId ?? m.pool_id ?? '') === String(pool.id));
    const poolParticipants = participants.filter(
      (p: any) => String(p.poolId ?? p.pool_id ?? '') === String(pool.id),
    );
    return {
      pool,
      rounds: groupFixtures(poolMatches),
      standings: computeStandings(poolMatches, poolParticipants),
      participants: poolParticipants,
    };
  });
};
export const partnerDisplay = (
  registration: RegistrationLike,
  players: Record<string, string>,
  guests: Record<string, string>,
) => {
  const p = registration.partner;
  const id = String(registration.partnerId ?? p?.id ?? '');
  if (!id) return 'Partner details unavailable';
  const type = registration.partnerType ?? p?.type;
  return (type === 'GUEST' ? guests[id] : players[id]) || 'Partner details unavailable';
};
export const fixtureQueryKeys = {
  fixtures: ['organizer-fixtures'],
  registrations: ['organizer-registrations'],
  playerFixtures: ['player-fixtures'],
};
