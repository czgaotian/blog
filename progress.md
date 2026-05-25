# Lightweight CMS Server Cleanup Progress

## 2026-05-25

- Started lightweight CMS cleanup planning after user confirmed product scope.
- Read planning skill instructions and created `task_plan.md`, `findings.md`, and `progress.md`.
- Checked existing dirty worktree and recorded app type extraction changes to preserve.
- Removed runtime registration for forms, built-in feature registry, magic-link auth, cache dashboard, and plugin-style feature route registration.
- Moved retained Security Audit and Analytics admin routes to non-plugin paths.
- Removed server/admin/shared source files for AI Search, alternate auth, cache, design/editor integrations, email/email templates, global variables, redirect management, shortcodes, Stripe, Turnstile, workflow, and forms.
- Removed form bootstrap sync and plugin middleware compatibility exports.
- Trimmed Drizzle schema and migrations for the lightweight CMS core; added `038_drop_removed_feature_tables.sql`.
- Regenerated the runtime migrations bundle and confirmed `pnpm --filter @worker-blog/server db:migrations:check` passes.
- Ran `pnpm type-check`; it passed after moving retained observability/user-profile shared types out of the deleted plugin types file.
- Ran server tests once; 28 files passed and `bootstrap.test.ts` failed because it still mocked removed form collection sync. Updated the test accordingly.
- Re-ran `pnpm type-check`; it passed.
- Re-ran `pnpm --filter @worker-blog/server test`; 29 test files and 373 tests passed.
- Ran `pnpm --filter @worker-blog/admin build`; it passed with existing Vite chunking warnings.
