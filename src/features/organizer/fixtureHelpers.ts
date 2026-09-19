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
export const roundLabel = (value: unknown): string => {
  const raw = String(value ?? '').replace(/_/g, ' ');
  if (/^ROUND 1$/i.test(raw) || raw === '1') return 'Round 1';
  if (/^ROUND 2$/i.test(raw) || raw === '2') return 'Quarter Final';
  if (/^ROUND 3$/i.test(raw) || raw === '3') return 'Semi Final';
  if (/^ROUND 4$/i.test(raw) || raw === '4') return 'Final';
  return raw || 'Fixtures';
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
