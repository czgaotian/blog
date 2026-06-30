# Task 1 Report: Shared Contracts And Server Settings API

## Status

DONE

## Scope completed

- Extended shared admin settings contracts to include `siteUrl` and `faviconUrl`.
- Added shared public settings contracts and exported them from `packages/shared/src/public-api/index.ts`.
- Extended `SettingsService` general settings defaults and persistence for `siteUrl` and `faviconUrl`.
- Added `SettingsService.getPublicSettings(): Promise<PublicSettings>`.
- Added `GET /api/settings` returning `{ data: settings }`.
- Added and updated tests for shared schema parsing, server settings service behavior, admin settings route shape, and the new public settings route.

## TDD evidence

### Red

Ran shared test first:

```bash
pnpm --filter @worker-blog/shared test src/admin-api/settings.test.ts
```

Observed expected failures:

- `siteUrl` missing from parsed data
- invalid URLs not rejected

Ran server tests before implementation:

```bash
pnpm --filter @worker-blog/server test src/services/settings.test.ts src/routes/admin-api-settings.test.ts src/routes/api-settings.test.ts
```

Observed expected failures:

- `siteUrl` and `faviconUrl` missing from general settings defaults
- `saveGeneralSettings()` did not persist the new fields
- `getPublicSettings()` did not exist
- `GET /api/settings` did not exist

### Green

Ran the required verification commands after implementation:

```bash
pnpm --filter @worker-blog/shared test src/admin-api/settings.test.ts
pnpm --filter @worker-blog/server test src/services/settings.test.ts src/routes/admin-api-settings.test.ts src/routes/api-settings.test.ts
```

Results:

- Shared tests: 3 passed
- Server tests: 38 passed

## Files changed

- `packages/shared/src/admin-api/settings.ts`
- `packages/shared/src/admin-api/settings.test.ts`
- `packages/shared/src/public-api/settings.ts`
- `packages/shared/src/public-api/index.ts`
- `packages/server/src/services/settings.ts`
- `packages/server/src/services/settings.test.ts`
- `packages/server/src/routes/admin-api-settings.test.ts`
- `packages/server/src/routes/api.ts`
- `packages/server/src/routes/api-settings.test.ts`

## Notes

- Kept the diff inside shared contracts, server service, and server routes as requested.
- Did not touch migration files.
- Did not modify admin UI or www files.

## Commit

- `feat: add public site settings API`
