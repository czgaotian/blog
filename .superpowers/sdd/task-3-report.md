# Task 3 Report: www Public Settings Consumption

## Scope

Implemented only the files assigned by the brief:

- `packages/www/src/lib/server/api.ts`
- `packages/www/src/lib/server/api.test.ts`
- `packages/www/src/routes/+layout.server.ts`
- `packages/www/src/routes/+layout.svelte`

## Changes

1. Added `fetchPublicSettings(eventFetch)` to the www server API helper, using the existing `getJson` path and `PublicSettingsResponse`.
2. Added a focused Vitest regression test covering the public settings helper request URL and returned payload.
3. Added root `+layout.server.ts` to fetch public settings and return the exact fallback settings from the brief when the request fails.
4. Updated root `+layout.svelte` to consume `data.settings`, drive metadata from settings, set `document.documentElement.lang` on the client, and render a maintenance-mode view when enabled.

## Verification

Red/green:

- `pnpm --filter @worker-blog/www test src/lib/server/api.test.ts`
  - Red: failed with `TypeError: fetchPublicSettings is not a function`
  - Green: passed after implementing the helper

Final required checks:

- `pnpm --filter @worker-blog/www test src/lib/server/api.test.ts`
- `pnpm --filter @worker-blog/www type-check`

Both passed.

## Notes

- Kept the diff minimal and stayed inside the four owned files plus this required report.
- Used the exact fallback values and layout behavior from the task brief verbatim.

## Fixes For Review Findings

1. Canonical URL and `og:url` now use the configured `siteUrl` plus the current request pathname from root layout server data, so non-root pages no longer point at the site root.
2. Added `packages/www/src/hooks.server.ts` to fetch public settings once per request, store them on `event.locals.settings`, and stamp SSR `<html lang="...">` via `transformPageChunk`. The client-side `document.documentElement.lang` update remains for client navigations.

### Fix Verification

- `pnpm --filter @worker-blog/www test src/lib/server/api.test.ts` — passed
- `pnpm --filter @worker-blog/www type-check` — passed

## Review Fix

Collapsed root settings consumption to a single source of truth in `packages/www/src/routes/+layout.server.ts`:

- Removed the extra `fetchPublicSettings` retry path from layout load.
- Returned `locals.settings ?? fallbackSettings` with the current pathname.
- Kept SSR `<html lang>` and layout data aligned on the same per-request settings value.

### Review Fix Verification

- `pnpm --filter @worker-blog/www test src/lib/server/api.test.ts` — passed
- `pnpm --filter @worker-blog/www type-check` — passed
