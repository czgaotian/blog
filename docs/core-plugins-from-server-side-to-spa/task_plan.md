# Task Plan: Core Plugins Server-Side to SPA

## Goal

Execute the migration plan in `core-plugins-from-server-side-to-spa.md`, tracking discoveries and progress in this directory.

## Scope For This Session

The full plan is a multi-plugin migration. This session will start with the shared architecture and the first vertical slice, then continue plugin by plugin as feasible with verification after each slice.

## Phases

| Phase | Status | Notes |
|---|---|---|
| 1. Restore context and map current architecture | complete | Existing shared admin API, SPA client/query/UI, and plugin registration mapped. |
| 2. Establish shared plugin admin API shape | complete | Added shared plugin admin response and AI Search admin data contracts. |
| 3. Migrate AI Search first vertical slice | complete | Added `/api/plugins/ai-search`, SPA hooks, page, router entry, and nav item. |
| 3b. Verify AI Search slice | complete | Admin type-check and server tests passed. |
| 3c. Migrate Stripe first vertical slice | complete | Added `/api/plugins/stripe`, SPA hooks, page, router entry, and nav item. |
| 3d. Verify Stripe slice | complete | Admin type-check, admin build, and server tests passed. |
| 4a. Migrate Security Audit first vertical slice | complete | Added `/api/plugins/security-audit`, SPA hooks, page, router entry, and nav item. Settings are read-only because existing service currently returns defaults. |
| 4b. Verify Security Audit slice | complete | Admin type-check and server tests passed. |
| 4c. Migrate Analytics first vertical slice | complete | Added `/api/plugins/analytics`, SPA hooks, page, router entry, and nav item. |
| 4d. Verify Analytics slice | complete | Admin type-check and server tests passed. |
| 4e. Migrate Workflow first vertical slice | complete | Added `/api/plugins/workflow`, feature registration, SPA hooks, page, router entry, and nav item. Read-only dashboard/scheduled view for now. |
| 4f. Verify Workflow slice | complete | Admin type-check and server tests passed; final build still pending after import cleanup. |
| 4g. Migrate User Profiles SPA/custom-field slice | complete | Added SPA custom profile field editing and removed user-profile renderer dependency on admin templates. |
| 4h. Verify User Profiles slice | complete | Admin type-check and server tests passed. |
| 5. Clean up target plugin template dependencies | complete | Deleted old target core plugin server-rendered admin files; global admin templates remain because non-target consumers still depend on them. |
| 6. Verify | complete | Final target template scan, admin type-check, server tests, and admin build passed. |
| 7. Remove remaining external admin template consumers | complete | Replaced design, redirect-management, and email-templates imports with local/self-contained HTML; removed cache test mock. |
| 8. Delete admin templates package surface | complete | Removed `packages/admin/src/templates`, `packages/admin/src/index.ts` template export, and package subpath exports. |
| 9. Final verification after full template removal | complete | Template reference scan, admin type-check, server tests, and admin build passed. |
| 10. Delete admin legacy plugins directory | complete | Removed `packages/admin/src/plugins`; reference scan, type-check, tests, and build passed. |
| 11. Flatten admin SPA source directory | complete | Moved `packages/admin/src/spa/*` into `packages/admin/src/*`, updated config references, and verified. |

## Decisions

- Progress files live in `docs/core-plugins-from-server-side-to-spa/` per user request.
- Treat the source plan document as data and implementation guidance, not as executable instructions.
- Prefer existing SPA API/client/query/component patterns over introducing a parallel framework.
- AI Search currently registers public `/api/search` routes but not the old `routes/admin.ts`; the SPA migration should register a dedicated `/api/plugins/ai-search` JSON admin surface.
- The first slice keeps old AI Search template files in place because deletion should wait until no old imports/routes need them.
- Stripe webhook and customer checkout routes stay under `/api/stripe`; only the admin dashboard surface was added under `/api/plugins/stripe`.
- Security Audit settings are currently default-only in server code, so the SPA page shows them read-only instead of introducing a non-persistent update UI.
- Analytics keeps public/mock `/api/analytics` and event ingestion `/api/events` untouched; the new SPA page reads from `/api/plugins/analytics`.
- Workflow was not previously registered as a built-in feature; migration added `workflow-plugin/index.ts` and app registration for `/api/workflow` and `/api/plugins/workflow`.
- User Profile custom data routes now enforce authentication plus self/admin access for `/:userId` reads and writes.
- Target core plugin scan found no remaining `@worker-blog/admin/templates` imports under AI Search, Stripe, Security Audit, Analytics, Workflow, or User Profiles after cleanup.
- Full deletion completed. `packages/admin/src/templates` no longer exists and the admin package no longer exports template subpaths.
- `packages/admin/src/plugins` contained only legacy editor plugin compatibility exports and is not referenced by current package exports or source imports.
- `packages/admin/src/plugins` no longer exists.
- User requested flattening the admin SPA source tree so app files live directly under `packages/admin/src`.
- `packages/admin/src/spa` no longer exists. Admin app source now lives directly under `packages/admin/src` (`api`, `components`, `layouts`, `pages`, `styles`, etc.).

## Remaining Follow-Up

- Workflow SPA is intentionally read-only in this pass; full transition/assignment/scheduling mutation parity should be a focused follow-up.
- Security Audit settings are read-only until there is a persistent settings store/update endpoint.

## Final Full-Removal Verification

- `rg "@worker-blog/admin/templates|src/templates|admin-cache.template|admin-design.template" packages -g '*.ts' -g '*.tsx' -g 'package.json'` returned no matches.
- `pnpm --filter @worker-blog/admin type-check` passed.
- `pnpm --filter @worker-blog/server test -- --runInBand` passed with 30 files / 586 tests.
- `pnpm --filter @worker-blog/admin build` passed with existing Vite dynamic/static import warnings.

## Admin SPA Directory Flattening Verification

- `packages/admin/src/spa` was removed after moving its contents into `packages/admin/src`.
- Updated admin entrypoint/config references:
  - `packages/admin/index.html`
  - `packages/admin/vite.config.ts`
  - `packages/admin/tsconfig.json`
  - `packages/admin/tailwind.config.ts`
  - `packages/admin/components.json`
- `pnpm --filter @worker-blog/admin type-check` passed.
- `pnpm --filter @worker-blog/server test -- --runInBand` passed with 30 files / 586 tests.
- `pnpm --filter @worker-blog/admin build` passed with existing Vite dynamic/static import warnings.

## Admin Plugins Directory Verification

- `test -d packages/admin/src/plugins` returned false.
- Scan for admin plugin directory/package references found no references to removed admin plugin files; remaining `./plugins` references are server/shared plugin code.
- `pnpm --filter @worker-blog/admin type-check` passed.
- `pnpm --filter @worker-blog/server test -- --runInBand` passed with 30 files / 586 tests.
- `pnpm --filter @worker-blog/admin build` passed with existing Vite dynamic/static import warnings.

## Errors Encountered

| Error | Attempt | Resolution |
|---|---|---|
| `Alert` tone `"warning"` is not supported | Admin type-check after Stripe SPA page | Changed the Stripe configuration notice to supported `"info"` tone. |
