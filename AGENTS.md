# SmashPoint AI Development Rules

## Golden Rule

The current application is a known-good working baseline. Never change existing business behavior merely to make the architecture look cleaner.

## Before Any Change

1. Inspect `git status`.
2. Inspect the relevant implementation and tests.
3. Trace the existing runtime flow.
4. Identify the exact files that must change.
5. Avoid unrelated modifications.
6. Preserve all uncommitted user work, including local configuration changes.

## Protected Areas

Treat authentication, OTP, access/refresh tokens, SecureStore, session restoration, `401` retry, workspace switching, authorization, registration, organizer/player relationships, Friendly creator self-join, approvals, Singles/Doubles, team pairing/shuffle, League, Knockout, BYE progression, fixtures, live scoring, results, medals, and notifications as protected. Changes require explicit task scope and regression testing.

## Architecture Rules

- Do not perform large refactors without explicit approval.
- Do not move or rename files simply because a cleaner architecture exists.
- Prefer small, targeted changes.
- Reuse existing services, hooks, API helpers, and components.
- Do not introduce a second competing implementation of an existing flow.

## API Rules

- Use the existing Axios `apiClient` and feature API architecture.
- Do not introduce raw `fetch` calls where the established client applies.
- Do not bypass authentication interceptors.
- Do not silently change API contracts or response assumptions.

## Authentication Rules

- Preserve refresh-token and SecureStore behavior.
- Do not treat every `403` as session expiry; follow existing behavior.
- Do not fabricate roles, tokens, OTP success, or authorization.

## Database / Backend Safety

Mobile work must not modify production database data, run destructive migrations, change Neon data, or deploy the Cloudflare backend unless explicitly requested.

## Git Safety

Never automatically use `git add .`, `git add -A`, `git reset --hard`, `git clean`, or force-push. Preserve unrelated modified and untracked files. Before committing, inspect the diff, stage only task-related files, and inspect the staged diff. Never commit secrets.

## Environment Safety

Never commit `.env`, `.dev.vars`, access tokens, refresh tokens, credential-bearing database URLs, private keys, API secrets, or service credentials. Do not print secret values.

## Testing Rules

Never claim PASS unless the check was actually run. Distinguish code inspection, typecheck, build, runtime test, and E2E test. If a check cannot be run, report `NOT TESTED` or `BLOCKED`.

## Documentation Rule

When behavior intentionally changes, review `BUSINESS_RULES.md` and/or `ARCHITECTURE.md`. Do not document behavior that has not been implemented.
