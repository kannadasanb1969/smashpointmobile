import { validateFriendly } from '../src/features/player/friendlyValidation';
import { friendlyIsOwner, pendingRequest } from '../src/features/player/friendly';
test('friendly limits', () => {
  expect(validateFriendly({ title: 'x', eventType: 'SINGLES', maxPlayers: 5 })).toBeTruthy();
  expect(validateFriendly({ title: 'x', eventType: 'SINGLES', maxPlayers: 6 })).toBeNull();
  expect(validateFriendly({ title: 'x', eventType: 'SINGLES', maxPlayers: 16 })).toBeNull();
  expect(validateFriendly({ title: 'x', eventType: 'SINGLES', maxPlayers: 17 })).toBeTruthy();
  expect(validateFriendly({ title: 'x', eventType: 'DOUBLES', maxPlayers: 7 })).toBeTruthy();
  expect(validateFriendly({ title: 'x', eventType: 'DOUBLES', maxPlayers: 8 })).toBeNull();
  expect(validateFriendly({ title: 'x', eventType: 'DOUBLES', maxPlayers: 9 })).toBeTruthy();
});
test('ownership and pending action mapping', () => {
  expect(friendlyIsOwner({ creator_player_id: 'p' }, 'p')).toBe(true);
  expect(friendlyIsOwner({ creator_player_id: 'p' }, 'q')).toBe(false);
  expect(pendingRequest('PENDING')).toBe(true);
  expect(pendingRequest('APPROVED')).toBe(false);
});
