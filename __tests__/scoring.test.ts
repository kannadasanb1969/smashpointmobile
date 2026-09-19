import { canCompleteMatch, scoreAllowed } from '../src/features/player/scoring';
test('win by two remains open beyond target until lead is two', () => {
  expect(canCompleteMatch(15, 14, 15)).toBe(false);
  expect(canCompleteMatch(17, 15, 15)).toBe(true);
  expect(canCompleteMatch(35, 33, 30)).toBe(true);
  expect(canCompleteMatch(40, 39, 30)).toBe(false);
  expect(scoreAllowed(0, 'DECREMENT')).toBe(false);
  expect(scoreAllowed(15, 'INCREMENT')).toBe(true);
});
