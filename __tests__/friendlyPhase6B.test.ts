import { friendlyPairingReady, friendlyPairingLocked } from '../src/features/player/friendly';
test('friendly pairing readiness and persistent lock', () => {
  expect(
    friendlyPairingReady({ event_type: 'DOUBLES' }, Array(8).fill({}), Array(4).fill({})),
  ).toBe(true);
  expect(
    friendlyPairingReady({ event_type: 'DOUBLES' }, Array(8).fill({}), Array(3).fill({})),
  ).toBe(false);
  expect(friendlyPairingLocked({ fixture: { id: 'f' } })).toBe(true);
  expect(friendlyPairingLocked(null)).toBe(false);
});
