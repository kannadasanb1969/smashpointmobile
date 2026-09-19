import { createInFlightGuard, cleanupAllowed } from '../src/features/player/friendly';
test('cleanup guard blocks duplicates, releases for retry, and is ownership gated', () => {
  const g = createInFlightGuard();
  expect(g.tryStart()).toBe(true);
  expect(g.tryStart()).toBe(false);
  g.release();
  expect(g.tryStart()).toBe(true);
  expect(cleanupAllowed({ creator_player_id: 'p', status: 'CLEANUP_PENDING' }, 'p')).toBe(true);
  expect(cleanupAllowed({ creator_player_id: 'p', status: 'COMPLETED' }, 'p')).toBe(false);
});
