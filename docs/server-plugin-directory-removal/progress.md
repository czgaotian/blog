# Server Plugin Directory Removal Progress

## 2026-05-17

- Created dedicated planning directory: `docs/server-plugin-directory-removal`.
- Created `task_plan.md`, `findings.md`, and this `progress.md` inside the planning directory as requested.
- Reviewed existing plugin removal and SPA migration plans.
- Inspected current `packages/server/src/plugins` inventory and active import references.
- No source code migration has been performed yet.

### First Execution Slice

- Moved `packages/server/src/plugins/core-plugins/database-tools-plugin` to `packages/server/src/features/database-tools`.
- Moved `packages/server/src/plugins/core-plugins/seed-data-plugin` to `packages/server/src/features/seed-data`.
- Removed their plugin `manifest.json` files instead of carrying plugin metadata into the feature layout.
- Updated `packages/server/src/app.ts` to import `createDatabaseToolsAdminRoutes` and `createSeedDataAdminRoutes` from `features`.
- Updated the database tools route import path for `requireAuth`.
- Ran `pnpm type-check`; it failed in the still-unmigrated `user-profiles` plugin route typing, not in the moved database tools or seed data modules.
- Moved `packages/server/src/plugins/core-plugins/user-profiles` to `packages/server/src/features/user-profiles`.
- Updated `packages/server/src/app.ts`, `packages/server/src/routes/auth.ts`, and OTP login's direct helper import to use the new user profiles feature path.
- Kept a temporary compatibility re-export from `packages/server/src/plugins/core-plugins/index.ts` to the new user profiles feature path.
- Removed the user profiles `manifest.json`.
- Fixed the user profiles route typing and added missing `userId` guards.
- Re-ran `pnpm type-check`; it passed.

### Full Directory Removal

- Moved auth features into `packages/server/src/features/auth`: OAuth providers, OTP login, and magic link auth.
- Moved email, global variables, shortcodes, Turnstile, editor integration helpers, AI Search, Analytics, Security Audit, Stripe, Workflow, and Cache into `packages/server/src/features`.
- Moved currently unmounted but code-bearing modules `design`, `redirect-management`, and `email-templates` into `packages/server/src/features` to preserve their code while removing the server plugin directory.
- Deleted manifest-only and example plugin folders with the removal of `packages/server/src/plugins`.
- Removed `WorkerBlogConfig.plugins`, `packages/server/src/config/plugins.ts`, and the default `pluginConfig` import from `packages/server/src/config/app.ts`.
- Updated moved route imports, middleware imports, tsconfig excludes, test mocks, and docs/comments that referenced old `src/plugins` paths.
- Confirmed `packages/server/src/plugins` no longer exists.
- Confirmed `find packages/server/src -path '*plugins*' -print` returns no paths.
- Ran `pnpm type-check`; it passed.
- Ran `pnpm --filter @worker-blog/server test`; 30 test files and 586 tests passed.
- Ran `pnpm --filter @worker-blog/admin build`; it passed.
