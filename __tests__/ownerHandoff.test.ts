import { buildOwnerHandoffUrl, ownerHandoffErrorMessage, signInToOwnerApp } from '../src/services/ownerHandoff';

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));

const BASE = 'http://api.test';
const TOKENS = { accessToken: 'ACCESS.TOKEN.VALUE', refreshToken: 'refresh-uuid.refresh-uuid' };

function harness(over: { openURL?: () => Promise<unknown>; handoff?: () => Promise<unknown>; verify?: () => Promise<unknown> } = {}) {
  const calls: { url: string; body: any; headers?: Record<string, string> }[] = [];
  const post = jest.fn(async (url: string, body?: any, config?: any) => {
    calls.push({ url, body, headers: config?.headers });
    if (url.endsWith('/verify-otp')) return over.verify ? over.verify() : { data: { success: true, data: { ...TOKENS, user: { id: 'u1' } } } };
    if (url.endsWith('/app-handoff')) return over.handoff ? over.handoff() : { data: { success: true, data: { code: 'ONE_TIME_CODE_abc-123_XYZ' } } };
    return { data: { success: true } };
  });
  const openURL = jest.fn(over.openURL ?? (async () => true));
  return { calls, deps: { post, openURL, baseUrl: BASE }, post, openURL };
}

test('happy path: verify (no role) -> handoff -> open -> revoke the temporary session, in that order', async () => {
  const h = harness();
  const result = await signInToOwnerApp('+919876543210', '12345', h.deps);
  expect(result).toBe('OPENED');
  expect(h.calls.map((c) => c.url.replace(BASE, ''))).toEqual(['/api/auth/verify-otp', '/api/auth/app-handoff', '/api/auth/logout']);
  expect(h.calls[0].body).toEqual({ mobile: '+919876543210', otp: '12345' }); // no role sent
  expect(h.calls[1].body).toEqual({ targetApp: 'OWNER' });
  expect(h.calls[1].headers).toEqual({ Authorization: `Bearer ${TOKENS.accessToken}` });
  expect(h.calls[2].body).toEqual({ refreshToken: TOKENS.refreshToken });
  // the revoke happens after the Owner app was asked to open
  expect(h.openURL.mock.invocationCallOrder[0]).toBeLessThan(h.post.mock.invocationCallOrder[2]);
});

test('the deep link contains ONLY the one-time code: no access or refresh token, no OTP, no mobile', async () => {
  const h = harness();
  await signInToOwnerApp('+919876543210', '12345', h.deps);
  const url = h.openURL.mock.calls[0][0] as string;
  expect(url).toBe('smashpointowner://auth-handoff?code=ONE_TIME_CODE_abc-123_XYZ');
  expect(url).not.toContain(TOKENS.accessToken);
  expect(url).not.toContain(TOKENS.refreshToken);
  expect(url).not.toMatch(/accessToken|refreshToken|token=|otp|98765/i);
  expect(buildOwnerHandoffUrl('a b/c')).toBe('smashpointowner://auth-handoff?code=a%20b%2Fc'); // always encoded
});

test('Owner app not installed: result is NOT_INSTALLED and the temporary session is still revoked', async () => {
  const h = harness({ openURL: async () => { throw new Error('Unable to open URL'); } });
  expect(await signInToOwnerApp('+919876543210', '12345', h.deps)).toBe('NOT_INSTALLED');
  expect(h.calls.at(-1)!.url).toContain('/api/auth/logout');
});

test('wrong OTP: error surfaces, nothing is created, opened or revoked', async () => {
  const h = harness({ verify: async () => { const e: any = new Error('x'); e.response = { status: 401, data: { message: 'Invalid or expired OTP' } }; throw e; } });
  await expect(signInToOwnerApp('+919876543210', '00000', h.deps)).rejects.toMatchObject({ response: { status: 401 } });
  expect(h.calls.map((c) => c.url.replace(BASE, ''))).toEqual(['/api/auth/verify-otp']);
  expect(h.openURL).not.toHaveBeenCalled();
});

test('handoff failure: the Owner app is never opened, the temporary session is cleaned up, and the error is raised', async () => {
  const h = harness({ handoff: async () => { throw new Error('boom'); } });
  await expect(signInToOwnerApp('+919876543210', '12345', h.deps)).rejects.toThrow('boom');
  expect(h.openURL).not.toHaveBeenCalled();
  expect(h.calls.map((c) => c.url.replace(BASE, ''))).toEqual(['/api/auth/verify-otp', '/api/auth/app-handoff', '/api/auth/logout']);
});

test('a logout failure never breaks the handoff', async () => {
  const h = harness();
  h.post.mockImplementation(async (url: string) => {
    if (url.endsWith('/logout')) throw new Error('offline');
    if (url.endsWith('/verify-otp')) return { data: { data: { ...TOKENS } } };
    return { data: { data: { code: 'C0DE_C0DE_C0DE_C0DE_C0DE' } } };
  });
  expect(await signInToOwnerApp('+919876543210', '12345', h.deps)).toBe('OPENED');
});

test('nothing is written to SecureStore: the Owner sign-in never creates a SmashPoint session', async () => {
  const SecureStore = require('expo-secure-store');
  const h = harness();
  await signInToOwnerApp('+919876543210', '12345', h.deps);
  expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
});

test('error messages are readable', () => {
  expect(ownerHandoffErrorMessage({ response: { data: { message: 'Invalid or expired OTP' } } })).toBe('Invalid or expired OTP');
  expect(ownerHandoffErrorMessage({ code: 'ECONNABORTED' })).toMatch(/Unable to connect/);
  expect(ownerHandoffErrorMessage(new Error('Oops'))).toBe('Oops');
});
