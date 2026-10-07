import axios from 'axios';
import { Linking } from 'react-native';
import { env } from '../config/env';
import { OWNER_APP_SCHEME } from '../config/ownerApp';

// SmashPoint -> SmashPoint Owner sign-in handoff.
//
// Owner is a separate app that shares the SAME SmashPoint accounts and OTP login. After the OTP is verified here we:
//   1. keep the resulting tokens in MEMORY only (nothing is written to SecureStore or the auth store, so the Owner login
//      never signs the user into SmashPoint),
//   2. ask the backend for a one-time handoff code (60 s, single use),
//   3. open smashpointowner://auth-handoff?code=<code>  (the code is the ONLY thing in the URL),
//   4. only AFTER the code exists and the open was attempted, revoke the temporary session. The Owner app exchanges the code
//      for its own independent session, so it does not depend on the temporary one.

export type OwnerHandoffResult = 'OPENED' | 'NOT_INSTALLED';

export const buildOwnerHandoffUrl = (code: string) => `${OWNER_APP_SCHEME}://auth-handoff?code=${encodeURIComponent(code)}`;

type Post = (url: string, body?: unknown, config?: { headers?: Record<string, string>; timeout?: number }) => Promise<{ data?: unknown }>;
type Deps = { post: Post; openURL: (url: string) => Promise<unknown>; baseUrl: string };

const defaults = (): Deps => ({ post: axios.post as unknown as Post, openURL: (url) => Linking.openURL(url), baseUrl: env.apiBaseUrl });

// Backend envelope is { success, data }; accept both shapes.
const unwrap = <T,>(res: { data?: unknown }): T => ((res.data as { data?: T } | undefined)?.data ?? (res.data as T));

export function ownerHandoffErrorMessage(e: unknown): string {
  const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (message) return message;
  if ((e as { response?: unknown })?.response === undefined && (e as { code?: string })?.code) return 'Unable to connect. Please check your connection and try again.';
  return e instanceof Error && e.message ? e.message : 'Please try again.';
}

export async function signInToOwnerApp(normalizedMobile: string, otp: string, deps: Deps = defaults()): Promise<OwnerHandoffResult> {
  const { post, openURL, baseUrl } = deps;
  // No role is sent: "Owner" is a destination app, not a global role (same call the Owner app itself makes).
  const verified = unwrap<{ accessToken?: string; refreshToken?: string }>(await post(`${baseUrl}/api/auth/verify-otp`, { mobile: normalizedMobile, otp }, { timeout: 15000 }));
  if (!verified?.accessToken || !verified?.refreshToken) throw new Error('Unexpected sign-in response.');
  const { accessToken, refreshToken } = verified;
  try {
    const handoff = unwrap<{ code?: string }>(
      await post(`${baseUrl}/api/auth/app-handoff`, { targetApp: 'OWNER' }, { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 15000 }),
    );
    if (!handoff?.code) throw new Error('Unexpected handoff response.');
    try {
      await openURL(buildOwnerHandoffUrl(handoff.code));
      return 'OPENED';
    } catch {
      return 'NOT_INSTALLED'; // no app handles smashpointowner://
    }
  } finally {
    // Cleanup of the temporary session, strictly after the handoff code was created (or creation failed). Best effort.
    try {
      await post(`${baseUrl}/api/auth/logout`, { refreshToken }, { timeout: 10000 });
    } catch {
      /* the temporary session is never stored; it expires on its own */
    }
  }
}
