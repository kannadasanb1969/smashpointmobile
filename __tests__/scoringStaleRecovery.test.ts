import { isStaleScoringError } from '../src/features/player/scoring';
test('only verified scoring conflicts are stale', () => {
  expect(
    isStaleScoringError({ status: 409, message: 'Match is already completed' }, 'complete'),
  ).toBe(true);
  expect(isStaleScoringError({ status: 500, message: 'server' }, 'complete')).toBe(false);
  expect(isStaleScoringError({ status: 403, message: 'forbidden' }, 'start')).toBe(false);
});
