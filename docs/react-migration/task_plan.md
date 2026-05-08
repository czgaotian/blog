# Admin SPA Migration Execution Plan

Source plan: `docs/react-migration/admin-react-migration-plan.md`

## Current Scope

Continue Phase 2: React SPA layout and reusable UI foundation. Do not migrate business pages yet.

## Tasks

### Phase 1: SPA Infrastructure

- [x] Review migration plan and execution constraints.
- [x] Attempt isolated worktree setup.
- [x] Capture baseline repo shape and test commands.
- [x] Add admin Vite React SPA skeleton.
- [x] Add admin API client, CSRF helper, router, and minimal `/admin/spa-test` route.
- [x] Add server `/admin/api/me`.
- [x] Add server SPA assets/shell routing without breaking legacy admin routes.
- [x] Update `wrangler.toml` assets config and R2 binding.
- [x] Run verification commands and record results.

### Phase 2: UI Foundation and Layout

- [x] Extend `/admin/api/me` bootstrap metadata to use configured app name.
- [x] Add first reusable SPA UI primitives: button, badge, alert, page header.
- [x] Update SPA admin layout to consume app metadata, user role, and plugin menu JSON.
- [x] Keep business/admin pages as legacy links during this phase.
- [x] Add more reusable table, pagination, filter, loading, and error boundary primitives.
- [x] Add dark mode toggle and persisted theme behavior.
- [x] Add frontend test harness for admin package and theme persistence coverage.
- [ ] Add dialog primitive when a migrated workflow needs confirmation/modal behavior.

## Decisions

- Worktree creation was requested by the user, but sandbox blocked branch/worktree creation because `.git` is read-only. Continue in current checkout with scoped edits.
- Keep legacy admin templates and routes intact for Phase 1.
- Phase 2 starts with a thin shell/layout increment before migrating any business page.
- Avoid adding a frontend test stack in this increment; use existing server Vitest coverage plus type-check/build verification.
- Added a minimal admin Vitest harness once theme persistence needed logic-level coverage.
- Defer dialog until the first migrated mutating workflow needs confirm/modal behavior.

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| `git worktree add` failed: `.git/refs/heads/...lock` read-only filesystem | Create isolated worktree | Added `.worktrees/` to `.gitignore`; sandbox still blocked branch creation. Continue in current checkout. |
| `pnpm type-check` failed resolving `vite/client` | Admin type-check | Moved Vite client reference from `compilerOptions.types` to `src/spa/vite-env.d.ts`. |
| `curl http://localhost:8788/admin/spa-test` failed to connect | Wrangler smoke check | Wrangler printed ready and bindings; sandbox curl could not reach the local server. Recorded as environment limitation. |
