import { scoringActions, canCompleteMatch } from '../src/features/player/scoring';
test('official authorized scorer can mutate a live match', () => {
  const a = scoringActions({ authorized: true, status: 'LIVE', scoreA: 10, scoreB: 8, target: 21 });
  expect(a.readOnly).toBe(false);
  expect(a.canIncrement).toBe(true);
});
test('official player is read-only', () => {
  const a = scoringActions({
    authorized: false,
    status: 'LIVE',
    scoreA: 10,
    scoreB: 8,
    target: 21,
  });
  expect(a.readOnly).toBe(true);
  expect(a.canStart).toBe(false);
  expect(a.canIncrement).toBe(false);
  expect(a.canComplete).toBe(false);
});
test('Friendly ownership does not authorize official context', () => {
  const a = scoringActions({
    authorized: false,
    status: 'LIVE',
    scoreA: 10,
    scoreB: 8,
    target: 21,
  });
  expect(a.readOnly).toBe(true);
});
test('completed match is immutable', () => {
  const a = scoringActions({
    authorized: true,
    status: 'COMPLETED',
    scoreA: 17,
    scoreB: 15,
    target: 15,
  });
  expect(a.readOnly).toBe(true);
  expect(a.canStart).toBe(false);
  expect(a.canIncrement).toBe(false);
  expect(a.canDecrement('A')).toBe(false);
  expect(a.canComplete).toBe(false);
});
test('eligible completion is manual and not implied by helper evaluation', () => {
  expect(canCompleteMatch(17, 15, 15)).toBe(true);
  expect(canCompleteMatch(16, 15, 15)).toBe(false);
});
