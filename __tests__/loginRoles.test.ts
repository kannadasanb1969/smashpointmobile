import { LOGIN_ROLES, OWNER_REDIRECT_NOTICE, routeAfterOtpRequest, workspaceParam } from '../src/utils/loginRoles';

test('login offers exactly Player, Organizer and Owner, in that order', () => {
  expect(LOGIN_ROLES.map((r) => r.key)).toEqual(['PLAYER', 'ORGANIZER', 'OWNER']);
  expect(LOGIN_ROLES.map((r) => r.title)).toEqual(['Player', 'Organizer', 'Owner']);
  expect(LOGIN_ROLES[2].copy).toBe('Manage Your\nAcademy');
});

test('Player and Organizer continue to the existing OTP screen with their workspace', () => {
  for (const role of ['PLAYER', 'ORGANIZER'] as const) {
    expect(routeAfterOtpRequest(role, '9876543210', '+919876543210')).toEqual({ pathname: '/(auth)/verify-otp', params: { mobile: '+919876543210', workspace: role } });
  }
});

test('Owner uses the same OTP screen, carrying only a destination marker (never a global role)', () => {
  const r = routeAfterOtpRequest('OWNER', '9876543210', '+919876543210');
  expect(r.pathname).toBe('/(auth)/verify-otp');
  expect(r.params).toEqual({ mobile: '+919876543210', workspace: 'OWNER' });
});

test('the temporary admin mobile keeps the existing workspace chooser', () => {
  expect(routeAfterOtpRequest('PLAYER', '8888888888', '+918888888888').pathname).toBe('/(auth)/choose-workspace');
});

test('workspace param parsing keeps old behaviour and adds OWNER', () => {
  expect(workspaceParam('ORGANIZER')).toBe('ORGANIZER');
  expect(workspaceParam('ADMIN')).toBe('ADMIN');
  expect(workspaceParam('OWNER')).toBe('OWNER');
  expect(workspaceParam(undefined)).toBe('PLAYER');
  expect(workspaceParam('nonsense')).toBe('PLAYER');
});

test('the Owner redirect notice matches the reference wording', () => {
  expect(OWNER_REDIRECT_NOTICE).toBe('You will be redirected to SmashPoint Owner app to manage your badminton academy.');
});
