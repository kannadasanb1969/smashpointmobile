import { isPlayerRegisteredForCategory } from '../src/features/player/registration';
import { validateGuestDob } from '../src/features/player/guestValidation';
describe('server-backed registration state', () => {
  const base = { id: '1', tournamentId: 't1', categoryId: 'c1', status: 'REGISTERED' };
  test('matches singles and doubles by IDs', () => {
    expect(isPlayerRegisteredForCategory([base], 't1', 'c1')).toBe(true);
    expect(isPlayerRegisteredForCategory([{ ...base, status: 'CONFIRMED' }], 't1', 'c1')).toBe(
      true,
    );
  });
  test('does not cross categories or tournaments', () => {
    expect(isPlayerRegisteredForCategory([base], 't1', 'c2')).toBe(false);
    expect(isPlayerRegisteredForCategory([base], 't2', 'c1')).toBe(false);
  });
  test('ignores inactive status', () =>
    expect(isPlayerRegisteredForCategory([{ ...base, status: 'CANCELLED' }], 't1', 'c1')).toBe(
      false,
    ));
});
describe('guest DOB validation', () => {
  test.each([
    ['', 'required'],
    ['1990/12/06', 'format'],
    ['2026-02-30', 'calendar'],
    ['2026-13-10', 'calendar'],
  ])('%s is rejected', (value, expected) => expect(validateGuestDob(value)).toBe(expected));
  test('valid historical date passes', () => expect(validateGuestDob('1990-12-06')).toBeNull());
});
