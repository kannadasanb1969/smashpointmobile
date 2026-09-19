import { parseMatchRealtimeEvent } from '../src/api/realtime/matchRealtime';
test('realtime accepts absolute valid events and rejects other rooms/malformed data', () => {
  expect(
    parseMatchRealtimeEvent(
      JSON.stringify({
        type: 'MATCH_SCORE_UPDATED',
        matchId: 'a',
        status: 'LIVE',
        participant1Score: 16,
        participant2Score: 14,
      }),
      'a',
    )?.participant1Score,
  ).toBe(16);
  expect(
    parseMatchRealtimeEvent(
      JSON.stringify({ type: 'MATCH_SCORE_UPDATED', matchId: 'b', status: 'LIVE' }),
      'a',
    ),
  ).toBeNull();
  expect(parseMatchRealtimeEvent('not json', 'a')).toBeNull();
});
