// Single source of truth for the mobile API base URL: the root apiConfig.ts
// (comment/uncomment file, not an env var). See apiConfig.ts at the project
// root — that is the ONLY file to edit to switch between LOCAL and
// PRODUCTION; nothing else in the app selects a runtime API URL.
import { API_BASE_URL } from '../../apiConfig';

if (!API_BASE_URL || typeof API_BASE_URL !== 'string' || !/^https?:\/\//.test(API_BASE_URL)) {
  throw new Error(
    'API_BASE_URL is missing or invalid. Check apiConfig.ts at the project root — exactly one API_BASE_URL line must be uncommented.',
  );
}

// A local-looking URL (emulator loopback or a LAN address) is LOCAL; anything
// else (the deployed Workers URL) is PRODUCTION. Derived, not duplicated, so
// there is nothing else to keep in sync with apiConfig.ts.
const isProduction = !/^https?:\/\/(10\.0\.2\.2|localhost|127\.0\.0\.1|192\.168\.)/i.test(API_BASE_URL);

export const env = { apiBaseUrl: API_BASE_URL, isConfigured: true, isProduction };

// Safe one-time startup banner — the URL itself is not a secret (it's the
// public API host), but never log tokens/headers/credentials here.
if (__DEV__) {
  console.log(`---------------------------------------\nSmashPoint API\n${isProduction ? 'PRODUCTION' : API_BASE_URL}\n---------------------------------------`);
}
