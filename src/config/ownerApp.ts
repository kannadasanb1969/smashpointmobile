// Where SmashPoint sends a signed-in Owner. This file is the ONLY place the Owner app link settings live.
//
// The deep link carries ONLY a short-lived one-time handoff code (never an access or refresh token):
//   smashpointowner://auth-handoff?code=<ONE_TIME_CODE>
export const OWNER_APP_SCHEME = 'smashpointowner';

// Store pages for "Owner app not installed". Leave EMPTY until the Owner app is published: nothing is invented, and the
// fallback screen then simply says the app is not installed.
export const OWNER_ANDROID_STORE_URL = '';
export const OWNER_IOS_STORE_URL = '';
