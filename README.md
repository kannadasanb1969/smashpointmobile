# SmashPoint

SmashPoint is a React Native badminton application for players, organizers, and administrators. The current mobile app supports player profiles and registrations, tournament management, Friendly Matches, fixtures, live match scoring, results, medals, notifications, and role-specific workflows.

## Technology Stack

- React Native `0.86.3` with Expo `~57.0.23`
- Expo Router for file-based navigation
- TypeScript
- TanStack React Query for server state and request caching
- Zustand for authentication/session state
- Axios for the API client
- Expo SecureStore for persisted access and refresh sessions
- Jest with `jest-expo` for tests

## Project Structure

- `app/` — Expo Router screens grouped by workspace: `(auth)`, `(player)`, `(organizer)`, and `(admin)`.
- `src/api/` — Axios client and realtime API helpers.
- `src/components/` — reusable UI components and domain presentation components.
- `src/features/` — feature API helpers, hooks, validation, scoring, registration, profile, and organizer operations.
- `src/store/` — Zustand authentication state.
- `src/services/` — SecureStore and other mobile services.
- `src/theme/` — colors, spacing, typography, radius, and shadows.
- `assets/` — Expo branding, splash/icon files, and badminton imagery.
- `__tests__/` — Jest unit and integration-style contract tests.

## Application Roles / Workspaces

The app uses `PLAYER`, `ORGANIZER`, and `ADMIN` roles. Route groups enforce the corresponding workspace experience. A user account and a Player Profile are separate concepts: a user can manage organizer workflows while still participating through an associated player profile where the backend permits it. Workspace switching requests a server-issued role session; it is not a client-side role override.

## Installation

```bash
npm install
```

## Running Locally

```bash
npm start
npm run android
npm run ios
```

Additional repository scripts:

```bash
npm run typecheck
npm run lint
npm test
```

## Environment Configuration

The mobile app's API base URL is set in one file: [`apiConfig.ts`](apiConfig.ts) at the project root. See [Local / Production Switching](#local--production-switching) below.

## Local / Production Switching

Configuration file:

```
apiConfig.ts
```

This is the only file that selects which API the app talks to. Exactly one `API_BASE_URL` line must be uncommented at a time.

### Local — Android Emulator

Uncomment:

```ts
export const API_BASE_URL = "http://10.0.2.2:8787";
```

Comment out the Production URL.

### Local — Physical Android Phone

Use the documented LAN URL:

```ts
export const API_BASE_URL = "http://192.168.0.100:8787";
```

- The Mac and the phone must be on the same network.
- The LAN IP may change when the network changes. If it does, update only this one line.

### Production

Comment out all LOCAL URLs. Uncomment:

```ts
export const API_BASE_URL =
  "https://badminton-api.kannadasanb1969.workers.dev";
```

> **IMPORTANT:** Only ONE `API_BASE_URL` line must be uncommented at a time.

### Quick reference

```
LOCAL:
  Mobile → apiConfig.ts LOCAL → Local API → dbConfig.js LOCAL → Local DB

PRODUCTION:
  Mobile → apiConfig.ts PRODUCTION → Production Cloudflare Worker → dbConfig.js PRODUCTION → Production DB
```

(`dbConfig.js` lives in the backend repository — see its README for details.)

## API

The mobile app calls the configured HTTPS API through `src/api/apiClient.ts`. The deployed backend is a Cloudflare Workers API backed by the project’s PostgreSQL service. Local development can target the local API URL configured by the environment.

## Authentication

Authentication uses OTP verification, access tokens, refresh tokens, Expo SecureStore persistence, session restoration, shared refresh/retry handling for authenticated `401` responses, logout/revocation, and server-backed workspace selection.

## Development Rules

Read [ARCHITECTURE.md](ARCHITECTURE.md), [BUSINESS_RULES.md](BUSINESS_RULES.md), and [AGENTS.md](AGENTS.md) before changing protected flows.
