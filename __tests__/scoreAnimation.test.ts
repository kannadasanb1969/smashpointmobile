import { scoreTransition } from '../src/components/common/AnimatedScoreValue';
test('score transition suppresses initial duplicate and completed updates', () => {
  expect(scoreTransition(undefined, 15)).toBe('NONE');
  expect(scoreTransition(15, 15)).toBe('NONE');
  expect(scoreTransition(15, 16)).toBe('UP');
  expect(scoreTransition(16, 15)).toBe('DOWN');
  expect(scoreTransition(16, 17, 'COMPLETED')).toBe('NONE');
});
