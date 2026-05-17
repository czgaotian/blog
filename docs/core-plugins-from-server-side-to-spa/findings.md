# Findings

## Initial Context

- Source plan: `docs/core-plugins-from-server-side-to-spa/core-plugins-from-server-side-to-spa.md`.
- Existing shared admin API package already exists under `packages/shared/src/admin-api/`.
- Existing SPA API/client/query and UI components already exist under `packages/admin/src/spa/`.
- Server plugin files exist under `packages/server/src/plugins/core-plugins/`.

## Architecture Discovery

- `packages/admin/src/index.ts` only re-exports `./templates`, so removing templates is currently not safe until all consumers are migrated.
- `createWorkerBlogApp` registers built-in feature routes through `registerBuiltInFeatureRoutes`; `/api/*` feature paths are mounted directly.
- `aiSearchFeature` currently registers only `{ path: '/api/search', handler: apiRoutes }`.
- `ai-search-plugin/routes/admin.ts` contains the old server-rendered page and several JSON-like admin subroutes, but it is not wired into `aiSearchFeature.routes`.
- The SPA router currently has no plugin pages.
- Existing SPA API hooks use React Query plus `adminFetch`.
- AI Search service methods needed for a first SPA page already exist: `getSettings`, `updateSettings`, `getAllCollections`, `detectNewCollections`, `getSearchAnalytics`, `getAllIndexStatus`, `indexCollection`, and `syncAll`.
- AI Search SPA migration created a new admin API instead of reusing `routes/admin.ts`, because the old file mixes HTML rendering with JSON endpoints.
- Verification after AI Search slice: `pnpm --filter @worker-blog/admin type-check` passed; `pnpm --filter @worker-blog/server test -- --runInBand` passed with 30 files / 586 tests.
- Stripe has existing admin-only JSON endpoints under `/api/stripe`, but the migration added `/api/plugins/stripe` as a normalized admin dashboard API while keeping webhook/checkout routes untouched.
- Verification after Stripe slice: admin type-check passed, admin build passed, server tests passed with 30 files / 586 tests.
- Security Audit existing API already exposes event/stats/lockout primitives under `/api/security-audit`; the migration added a normalized `/api/plugins/security-audit` dashboard API for SPA consumption.
- Security Audit old settings are static defaults in route code, so the SPA page avoids editable controls for now.
- Verification after Security Audit slice: admin type-check passed; server tests passed with 30 files / 586 tests.
- Analytics `analyticsFeature` still exposes a mock `/api/analytics`; real event tracking is mounted separately in `app.ts` under `/api/events`.
- Analytics SPA migration added `/api/plugins/analytics`, combining system log metrics and analytics event stats with empty fallbacks if tables are absent.
- Verification after Analytics slice: admin type-check passed; server tests passed with 30 files / 586 tests.
- Workflow had no `index.ts` and was not registered in `app.ts`; migration added a feature export and registered it.
- Workflow SPA migration is a read-only dashboard because the old UI includes several form workflows and HTMX-era operations that need a dedicated follow-up for full interaction parity.
- User Profiles is not a standalone server-rendered admin page; it is a custom profile fields API plus a legacy renderer.
- User Profiles migration added custom field editing to the existing SPA Profile page and removed `@worker-blog/admin/templates` from `user-profile-renderer.ts`.
- User profile `/:userId` custom data read/write routes previously lacked actual auth middleware despite comments saying auth was required; migration added `requireAuth` plus self/admin checks.
- Verification after User Profiles slice: admin type-check passed; server tests passed with 30 files / 586 tests.
- `packages/admin/src/templates` cannot be safely deleted in this pass because non-target modules still import it: design plugin, available email templates plugin, cache tests/template, redirect-management templates, and many template package internals.
- Old server-rendered admin files for the migrated target plugins were deleted where no live imports remained.
- Final target-plugin scan for `@worker-blog/admin/templates` returned no matches.
- Final verification passed:
  - `pnpm --filter @worker-blog/admin type-check`
  - `pnpm --filter @worker-blog/server test -- --runInBand`
  - `pnpm --filter @worker-blog/admin build`
- Final admin build still reports pre-existing Vite warnings about modules imported both dynamically and statically (`migrations.ts`, `auth.ts`); build succeeds.

## Open Questions

- Whether the old AI Search admin route can be deleted immediately, or should be left orphaned until final cleanup.
- Remaining template consumers outside the six target core plugin slices.
- Whether removing `packages/admin/src/templates` is currently safe, or blocked by other non-core pages/plugins.

## Full Template Removal Follow-Up

Remaining external blockers from the latest scan:

- `packages/server/src/plugins/design/routes.ts`
- `packages/server/src/plugins/redirect-management/templates/redirect-list.template.ts`
- `packages/server/src/plugins/redirect-management/templates/redirect-form.template.ts`
- `packages/server/src/plugins/available/email-templates-plugin/admin-routes.ts`
- `packages/server/src/plugins/cache/tests/routes.test.ts`
- `packages/admin/src/index.ts`

All blockers above were resolved in the follow-up pass:

- Design route now renders a small self-contained page.
- Redirect management templates now use self-contained HTML shells with Tailwind/HTMX CDN references instead of importing admin templates.
- Email templates plugin now uses a local compatibility layout helper.
- Cache route test no longer mocks removed admin template files.
- Admin package template exports were removed and `packages/admin/src/templates` was deleted.
- Final scan found no remaining `@worker-blog/admin/templates` or `src/templates` references in packages.

## Admin Plugins Directory Removal

- `packages/admin/src/plugins` contained only legacy editor plugin compatibility exports:
  - `available/easy-mdx/index.ts`
  - `available/tinymce-plugin/index.ts`
  - `core-plugins/quill-editor/index.ts`
  - `easy-mdx.ts`
  - `tinymce-plugin.ts`
- The admin package no longer exports plugin subpaths, and source scan found no live imports of these files.
- `packages/admin/src/plugins` was deleted.
- Verification after deletion passed:
  - admin type-check
  - server tests, 30 files / 586 tests
  - admin build with existing Vite dynamic/static import warnings

## Admin SPA Directory Flattening

- Moved admin app files from `packages/admin/src/spa/*` to `packages/admin/src/*`.
- Updated Vite entrypoint and aliases from `src/spa` to `src`.
- Updated Tailwind and shadcn `components.json` paths from `src/spa` to `src`.
- Code verification passed; remaining `src/spa` references from the broad scan are historical docs only.
