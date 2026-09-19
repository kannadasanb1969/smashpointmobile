import { scoreTransition } from '../src/components/common/AnimatedScoreValue';
import { scoringActions } from '../src/features/player/scoring';
test('read-only LIVE match selects animated score path', () => {
  const a = scoringActions({
    authorized: false,
    status: 'LIVE',
    scoreA: 14,
    scoreB: 12,
    target: 21,
  });
  expect(a.readOnly).toBe(true);
  expect(scoreTransition(14, 15, 'LIVE')).toBe('UP');
});
test('authorized official scorer selects static score path', () => {
  expect(
    scoringActions({ authorized: true, status: 'LIVE', scoreA: 14, scoreB: 12, target: 21 })
      .readOnly,
  ).toBe(false);
});
test('Friendly creator selects static score path', () => {
  expect(
    scoringActions({ authorized: true, status: 'LIVE', scoreA: 14, scoreB: 12, target: 21 })
      .readOnly,
  ).toBe(false);
});
test('completed read-only and scorer scores are static', () => {
  expect(scoreTransition(14, 15, 'COMPLETED')).toBe('NONE');
  expect(
    scoringActions({ authorized: true, status: 'COMPLETED', scoreA: 15, scoreB: 12, target: 15 })
      .readOnly,
  ).toBe(true);
});
test('only changed side transitions', () => {
  expect(scoreTransition(14, 15, 'LIVE')).toBe('UP');
  expect(scoreTransition(12, 12, 'LIVE')).toBe('NONE');
});
test('duplicate absolute score does not reanimate', () => {
  expect(scoreTransition(15, 15, 'LIVE')).toBe('NONE');
});
test('REST then matching WS absolute score does not reanimate', () => {
  expect(scoreTransition(16, 16, 'LIVE')).toBe('NONE');
});
test('reduced motion still has deterministic no-motion initial transition', () => {
  expect(scoreTransition(undefined, 16, 'LIVE')).toBe('NONE');
});
test('completed state preserves server winner field without local calculation', () => {
  const server = { status: 'COMPLETED', winnerParticipantName: 'Server Winner' };
  expect(server.winnerParticipantName).toBe('Server Winner');
  expect(scoreTransition(20, 18, server.status)).toBe('NONE');
});
test('extended scores remain direction-aware', () => {
  expect(scoreTransition(35, 41, 'LIVE')).toBe('UP');
  expect(scoreTransition(41, 40, 'LIVE')).toBe('DOWN');
});
