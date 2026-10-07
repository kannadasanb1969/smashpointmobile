// Role-first login: the three cards on the SmashPoint login screen.
// PLAYER / ORGANIZER are the existing workspaces. OWNER is NOT a global role: it only chooses the destination app
// (SmashPoint Owner) after the normal OTP login, so nothing here ever changes users.role.
export type LoginRole = 'PLAYER' | 'ORGANIZER' | 'OWNER';

export const LOGIN_ROLES: { key: LoginRole; title: string; copy: string; accent: string; tint: string }[] = [
  { key: 'PLAYER', title: 'Player', copy: 'Join Tournaments\nPlay Matches', accent: '#1E9E5A', tint: '#E4F5EB' },
  { key: 'ORGANIZER', title: 'Organizer', copy: 'Create Tournaments\nManage Events', accent: '#5B5BD6', tint: '#ECECFB' },
  { key: 'OWNER', title: 'Owner', copy: 'Manage Your\nAcademy', accent: '#E8890C', tint: '#FFF1DC' },
];

export const OWNER_REDIRECT_NOTICE = 'You will be redirected to SmashPoint Owner app to manage your badminton academy.';

// The temporary admin mobile keeps the existing workspace chooser (it is the only way to reach the ADMIN workspace).
const ADMIN_DISPLAY_MOBILE = '8888888888';

export function routeAfterOtpRequest(role: LoginRole, displayMobile: string, normalizedMobile: string) {
  if (displayMobile === ADMIN_DISPLAY_MOBILE) return { pathname: '/(auth)/choose-workspace' as const, params: { mobile: normalizedMobile } };
  return { pathname: '/(auth)/verify-otp' as const, params: { mobile: normalizedMobile, workspace: role } };
}

export type VerifyWorkspace = 'PLAYER' | 'ORGANIZER' | 'ADMIN' | 'OWNER';
/** Unknown / missing values fall back to PLAYER exactly like the previous screen did. */
export function workspaceParam(value: string | undefined): VerifyWorkspace {
  return value === 'ORGANIZER' || value === 'ADMIN' || value === 'OWNER' ? value : 'PLAYER';
}
