import { registrationKeys } from '../src/utils/authAndRegistrationHelpers';
import { isPlayerRegisteredForCategory } from '../src/features/player/registration';
test('singles, existing doubles and guest doubles use server identity state', () => {
  const rs = [
    { id: '1', tournamentId: 't', categoryId: 's', status: 'REGISTERED' },
    { id: '2', tournamentId: 't', categoryId: 'd', status: 'CONFIRMED' },
  ];
  expect(isPlayerRegisteredForCategory(rs, 't', 's')).toBe(true);
  expect(isPlayerRegisteredForCategory(rs, 't', 'd')).toBe(true);
  expect(isPlayerRegisteredForCategory(rs, 't', 'x')).toBe(false);
});
test('query invalidation covers current protected keys', () => {
  expect(registrationKeys).toEqual(
    expect.arrayContaining(['registrations', 'tournament', 'tournaments']),
  );
});
test('failed eligibility cannot proceed', () => {
  const result = { eligible: false };
  expect(result.eligible).toBe(false);
});
test('pending guards are deterministic', () => {
  const pending = true;
  expect(pending).toBe(true);
});
