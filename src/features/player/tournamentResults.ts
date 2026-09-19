const value = (object: any, ...keys: string[]) =>
  keys
    .map((key) => object?.[key])
    .find((item) => item !== undefined && item !== null && item !== '');
export const sideValue = (fixture: any, side: 1 | 2) =>
  value(
    fixture,
    `participant${side}`,
    `player${side}`,
    `team${side}`,
    `side${side}`,
    `participant${side}Id`,
    `participant${side}_id`,
    `player${side}Id`,
    `player${side}_id`,
    `team${side}Id`,
    `team${side}_id`,
    `participant${side}Name`,
    `participant${side}_name`,
    `player${side}Name`,
    `player${side}_name`,
    `team${side}Name`,
    `team${side}_name`,
  );
export const normalizeFixtureResponse = (items: any[]): any[] =>
  items.flatMap((item) =>
    Array.isArray(item?.matches)
      ? item.matches.map((match: any) => ({
          ...match,
          tournamentId:
            match.tournamentId ??
            match.tournament_id ??
            item.tournamentId ??
            item.tournament_id ??
            item.tournament?.id,
          categoryId:
            match.categoryId ??
            match.category_id ??
            match.tournamentCategoryId ??
            match.tournament_category_id ??
            item.categoryId ??
            item.category_id ??
            item.tournamentCategoryId ??
            item.tournament_category_id ??
            item.category?.id,
          published: match.published ?? item.published ?? item.status === 'PUBLISHED',
          eventType: match.eventType ?? item.eventType,
          categoryName: match.categoryName ?? item.categoryName,
          tournamentName: match.tournamentName ?? item.tournamentName,
          winningPoints: match.winningPoints ?? item.winningPoints,
        }))
      : [item],
  );
const sideId = (side: any) =>
  String(
    typeof side === 'string' || typeof side === 'number'
      ? side
      : value(
          side,
          'id',
          'playerId',
          'player_id',
          'teamId',
          'team_id',
          'participantId',
          'participant_id',
        ) || '',
  );
const status = (fixture: any) =>
  String(value(fixture, 'matchStatus', 'match_status', 'status') || '').toUpperCase();
const score = (fixture: any, side: 1 | 2) =>
  value(
    fixture,
    `participant${side}Score`,
    `participant${side}_score`,
    `player${side}Score`,
    `player${side}_score`,
    `team${side}Score`,
    `team${side}_score`,
    `score${side}`,
  );
export const participantNames = (side: any): string[] => {
  if (side == null || side === '') return [];
  if (Array.isArray(side)) return side.flatMap(participantNames);
  if (typeof side === 'object') {
    const members = value(side, 'members', 'players', 'teamMembers', 'team_members');
    if (Array.isArray(members)) {
      const names = members.flatMap(participantNames);
      if (names.length) return names;
    }
    const name = value(
      side,
      'fullName',
      'full_name',
      'displayName',
      'display_name',
      'playerName',
      'player_name',
      'name',
    );
    return name ? [String(name)] : [];
  }
  return [String(side)];
};
export const fixtureWinnerSide = (fixture: any): 1 | 2 | null => {
  if (!fixture) return null;
  const explicitSide = value(fixture, 'winnerSide', 'winner_side');
  if ([1, '1', 'A', 'PLAYER_1', 'TEAM_1'].includes(explicitSide)) return 1;
  if ([2, '2', 'B', 'PLAYER_2', 'TEAM_2'].includes(explicitSide)) return 2;
  const winner = value(fixture, 'winner', 'result');
  const winnerId = String(
    value(
      fixture,
      'winnerId',
      'winner_id',
      'winnerParticipantId',
      'winner_participant_id',
      'winnerPlayerId',
      'winner_player_id',
      'winnerTeamId',
      'winner_team_id',
    ) ||
      (winner &&
        value(
          winner,
          'id',
          'playerId',
          'player_id',
          'teamId',
          'team_id',
          'participantId',
          'participant_id',
        )) ||
      '',
  );
  if (winnerId && winnerId === sideId(sideValue(fixture, 1))) return 1;
  if (winnerId && winnerId === sideId(sideValue(fixture, 2))) return 2;
  const a = Number(score(fixture, 1)),
    b = Number(score(fixture, 2));
  return status(fixture) === 'COMPLETED' && Number.isFinite(a) && Number.isFinite(b) && a !== b
    ? a > b
      ? 1
      : 2
    : null;
};
export const findFinalFixture = (fixtures: any[]) => {
  const completed = fixtures.filter((fixture) => status(fixture) === 'COMPLETED');
  if (!completed.length) return undefined;
  const marked = completed.find((fixture) => fixture.isFinal === true);
  if (marked) return marked;
  const named = completed.find(
    (fixture) =>
      /(^|\s|_)FINAL(\s|_|$)/i.test(
        String(value(fixture, 'stage', 'roundName', 'round_name', 'round') || ''),
      ) &&
      !/SEMI\s*_?FINAL/i.test(
        String(value(fixture, 'stage', 'roundName', 'round_name', 'round') || ''),
      ),
  );
  if (named) return named;
  return completed.reduce(
    (latest, fixture) =>
      Number(value(fixture, 'roundNumber', 'round_number', 'round')) >
      Number(value(latest, 'roundNumber', 'round_number', 'round'))
        ? fixture
        : latest,
    completed[0],
  );
};
const namesForSide = (fixture: any, side: 1 | 2, players: any[] = []) => {
  const direct = participantNames(
    value(
      fixture,
      `participant${side}Name`,
      `participant${side}_name`,
      `player${side}Name`,
      `player${side}_name`,
      `team${side}Name`,
      `team${side}_name`,
    ),
  );
  if (direct.length) return direct;
  const participant = sideValue(fixture, side);
  const names = participantNames(participant);
  if (names.length && !/^[0-9a-f-]{20,}$/i.test(names[0])) return names;
  const id = sideId(participant);
  const player = players.find(
    (item) => String(item?.id ?? item?.playerId ?? item?.player_id) === id,
  );
  return participantNames(player);
};
export const getFixtureWinner = (fixture: any, players: any[] = []) => {
  const side = fixtureWinnerSide(fixture);
  if (!side)
    return participantNames(
      value(fixture, 'winner', 'winnerParticipant', 'winnerPlayer', 'winnerTeam'),
    );
  const names = namesForSide(fixture, side, players);
  return players.length ? names : names.filter((name) => !/^[0-9a-f-]{20,}$/i.test(name));
};
export const getFixtureRunnerUp = (fixture: any, players: any[] = []) => {
  const side = fixtureWinnerSide(fixture);
  if (!side) return [];
  const names = namesForSide(fixture, side === 1 ? 2 : 1, players);
  return players.length ? names : names.filter((name) => !/^[0-9a-f-]{20,}$/i.test(name));
};
