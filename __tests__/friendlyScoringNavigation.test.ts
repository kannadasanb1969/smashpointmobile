import { scoringActions } from '../src/features/player/scoring';
test('friendly creator scoring actions are writable and non-owner is read-only', () => {
  expect(
    scoringActions({ authorized: true, status: 'LIVE', scoreA: 15, scoreB: 12, target: 21 })
      .canIncrement,
  ).toBe(true);
  expect(
    scoringActions({ authorized: false, status: 'LIVE', scoreA: 15, scoreB: 12, target: 21 })
      .readOnly,
  ).toBe(true);
});
