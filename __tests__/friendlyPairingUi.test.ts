import { friendlyPairingReady, friendlyPairingLocked } from '../src/features/player/friendly';
test('pairing UI readiness is server-data based', () => {
  expect(
    friendlyPairingReady({ event_type: 'DOUBLES' }, Array(8).fill({}), Array(4).fill({})),
  ).toBe(true);
  expect(
    friendlyPairingReady({ event_type: 'DOUBLES' }, Array(8).fill({}), Array(3).fill({})),
  ).toBe(false);
  expect(friendlyPairingLocked({ fixture: { id: 'fixture' } })).toBe(true);
});
