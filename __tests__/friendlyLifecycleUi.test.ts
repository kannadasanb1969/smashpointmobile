import { friendlyStatusLabel, cleanupAllowed } from '../src/features/player/friendly';
test('lifecycle UI uses server statuses and creator cleanup rule', () => {
  expect(friendlyStatusLabel('COMPLETED')).toBe('Completed');
  expect(friendlyStatusLabel('CLEANUP_PENDING')).toBe('Cleanup Pending');
  expect(cleanupAllowed({ creator_player_id: 'p', status: 'CLEANUP_PENDING' }, 'p')).toBe(true);
  expect(cleanupAllowed({ creator_player_id: 'p', status: 'COMPLETED' }, 'p')).toBe(false);
  expect(cleanupAllowed({ creator_player_id: 'p', status: 'CLEANUP_PENDING' }, 'q')).toBe(false);
});
