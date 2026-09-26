import { resolveFriendlySide } from '../src/features/player/friendly';

jest.mock('../src/api/apiClient', () => ({ apiClient: {} }));

test('resolves Friendly player sides by Player Profile ID', () => {
  const players = [{ id: 'participant-row-uuid', player_id: 'player-profile-uuid', full_name: 'Sudhakar' }];

  expect(resolveFriendlySide('player-profile-uuid', players)).toBe('Sudhakar');
  expect(resolveFriendlySide(null, players)).toBe('TBD');
  expect(resolveFriendlySide('unknown-profile-uuid', players)).toBe('TBD');
  expect(resolveFriendlySide({ type: 'BYE' }, players)).toBe('BYE');
});
