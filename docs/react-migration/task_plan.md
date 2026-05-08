# Admin SPA Migration Execution Plan

Source plan: `docs/react-migration/admin-react-migration-plan.md`

## Current Scope

Execute Phase 1 only: React SPA infrastructure, server SPA/assets fallback, `/admin/api/me`, and Worker binding config fixes. Do not migrate business pages yet.

## Tasks

- [x] Review migration plan and execution constraints.
- [x] Attempt isolated worktree setup.
- [x] Capture baseline repo shape and test commands.
- [x] Add admin Vite React SPA skeleton.
- [x] Add admin API client, CSRF helper, router, and minimal `/admin/spa-test` route.
- [x] Add server `/admin/api/me`.
- [x] Add server SPA assets/shell routing without breaking legacy admin routes.
- [x] Update `wrangler.toml` assets config and R2 binding.
- [x] Run verification commands and record results.

## Decisions

- Worktree creation was requested by the user, but sandbox blocked branch/worktree creation because `.git` is read-only. Continue in current checkout with scoped edits.
- Keep legacy admin templates and routes intact for Phase 1.

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| `git worktree add` failed: `.git/refs/heads/...lock` read-only filesystem | Create isolated worktree | Added `.worktrees/` to `.gitignore`; sandbox still blocked branch creation. Continue in current checkout. |
| `pnpm type-check` failed resolving `vite/client` | Admin type-check | Moved Vite client reference from `compilerOptions.types` to `src/spa/vite-env.d.ts`. |
| `curl http://localhost:8788/admin/spa-test` failed to connect | Wrangler smoke check | Wrangler printed ready and bindings; sandbox curl could not reach the local server. Recorded as environment limitation. |
