type AvailabilityInput = {
  fixture?: any;
  fixtures?: any[];
  results?: any[];
  visibility?: 'published' | 'generated';
};

const first = (value: any, ...keys: string[]) =>
  keys.map((key) => value?.[key]).find((item) => item !== undefined && item !== null && item !== '');

const side = (match: any, number: 1 | 2) =>
  first(
    match,
    `participant${number}`,
    `participant${number}_id`,
    `participant${number}Id`,
    `player${number}`,
    `player${number}_id`,
    `player${number}Id`,
    `team${number}`,
    `team${number}_id`,
    `team${number}Id`,
  );

const isBye = (match: any) =>
  Boolean(match?.bye || match?.isBye || match?.is_bye) ||
  /\bBYE\b/i.test(String(first(match, 'round', 'roundName', 'round_name', 'stage') || ''));

const isCompletedPlayableMatch = (match: any) => {
  if (String(first(match, 'status', 'matchStatus', 'match_status') || '').toUpperCase() !== 'COMPLETED') {
    return false;
  }
  if (isBye(match) || side(match, 1) == null || side(match, 2) == null) return false;
  const winner = first(
    match,
    'winner',
    'winnerId',
    'winner_id',
    'winnerParticipantId',
    'winner_participant_id',
    'winnerPlayerId',
    'winner_player_id',
    'winnerTeamId',
    'winner_team_id',
  );
  const score1 = first(match, 'participant1Score', 'participant1_score', 'player1Score', 'player1_score', 'team1Score', 'team1_score', 'score1');
  const score2 = first(match, 'participant2Score', 'participant2_score', 'player2Score', 'player2_score', 'team2Score', 'team2_score', 'score2');
  return winner != null || (score1 != null && score2 != null && Number(score1) !== Number(score2));
};

const isAuthoritativeResult = (result: any) =>
  Boolean(result?.winner || result?.runnerUp || result?.runner_up || result?.result?.winner || result?.winnerParticipantId);

export const getContentAvailability = ({
  fixture,
  fixtures = [],
  results = [],
  visibility = 'generated',
}: AvailabilityInput) => {
  const rows = Array.isArray(fixtures) ? fixtures : [];
  const hasFixtures = Boolean(fixture || rows.length);
  const published =
    fixture?.published === true || String(fixture?.status || '').toUpperCase() === 'PUBLISHED' ||
    rows.some((row) => row?.published === true || String(row?.status || '').toUpperCase() === 'PUBLISHED');
  const hasCompletedMatches = rows.some(isCompletedPlayableMatch) || results.some(isAuthoritativeResult);
  return {
    hasFixtures,
    canViewFixtures: hasFixtures && (visibility === 'generated' || published),
    hasCompletedMatches,
    canViewResults: hasCompletedMatches,
  };
};
