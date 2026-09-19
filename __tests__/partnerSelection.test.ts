import { canSelectPartner, partnerPayload } from '../src/utils/authAndRegistrationHelpers';
test('self selection is blocked by stable ID', () => {
  expect(canSelectPartner('p1', 'p1')).toBe(false);
  expect(canSelectPartner('p1', 'p2')).toBe(true);
});
test('mode payload cannot carry stale identity', () => {
  expect(partnerPayload({ mode: 'PLAYER', playerId: 'p1', guestId: 'g1' })).toEqual({
    id: 'p1',
    type: 'PLAYER',
  });
  expect(partnerPayload({ mode: 'GUEST', playerId: 'p1', guestId: 'g1' })).toEqual({
    id: 'g1',
    type: 'GUEST',
  });
});
