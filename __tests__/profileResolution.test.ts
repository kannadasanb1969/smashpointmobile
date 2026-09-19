import { resolvePlayerProfile, type PlayerProfile } from '../src/features/player/profile';

const profile = (userId: string | null, mobile: string): PlayerProfile => ({
  id: 'profile-1',
  playerCode: 'P001',
  userId,
  fullName: 'Player',
  dob: '1990-01-01',
  age: 36,
  mobile,
  location: 'Chennai',
  playingSince: 2020,
  experienceYears: 6,
  regularPlayer: false,
  courtAcademy: null,
  profilePhoto: null,
  profileStatus: 'ACTIVE',
});

test('resolves a linked profile by exact authenticated user id', () => {
  expect(
    resolvePlayerProfile([profile('f25ec5a6-4679-4109-84b1-26e195e2ea3a', '9566235342')], {
      id: 'f25ec5a6-4679-4109-84b1-26e195e2ea3a',
    })?.id,
  ).toBe('profile-1');
});

test('uses exact mobile only for an unlinked profile and never fuzzy matches', () => {
  expect(
    resolvePlayerProfile([profile(null, '9566235342')], { id: 'other', mobile: '9566235342' })?.id,
  ).toBe('profile-1');
  expect(
    resolvePlayerProfile([profile(null, '9566235342')], { id: 'other', mobile: '956623534' }),
  ).toBeNull();
});

test('returns null when no profile matches', () => {
  expect(
    resolvePlayerProfile([profile('different', '000')], {
      id: 'f25ec5a6-4679-4109-84b1-26e195e2ea3a',
      mobile: '9566235342',
    }),
  ).toBeNull();
});
