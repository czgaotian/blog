# Server Plugin Directory Removal Task Plan

## Goal

Remove the `packages/server/src/plugins` directory while preserving all currently reachable product functionality.

The target architecture is explicit built-in server features, routes, services, and admin API modules. Runtime behavior must not depend on a `plugins` source directory, plugin manifests, plugin config, or plugin-style import paths.

## Planning Files

- Main execution plan: `docs/server-plugin-directory-removal/server-plugin-directory-removal-plan.md`
- Findings: `docs/server-plugin-directory-removal/findings.md`
- Progress log: `docs/server-plugin-directory-removal/progress.md`

## Current Status

Status: complete

This plan only prepares the implementation. No source migration has been performed in this step.

## Phases

### Phase 1: Inventory and Classification

Status: complete

- [x] Enumerate all files under `packages/server/src/plugins`.
- [x] Classify each module as active runtime feature, admin-only feature, editor integration, fixture/example, docs-only artifact, or removable manifest.
- [x] Record public routes, admin routes, services, middleware, and tests for each active feature.
- [x] Identify feature ownership and target destination paths under `packages/server/src/features`, `packages/server/src/services`, `packages/server/src/routes`, or existing domain folders.

### Phase 2: Establish Non-Plugin Feature Structure

Status: complete

- [x] Create `packages/server/src/features` layout for active built-in capabilities that currently live under `plugins`.
- [x] Define stable export paths for feature modules.
- [x] Keep route paths initially compatible, including `/api/plugins/*` where admin SPA already depends on them.
- [x] Decide which route paths get compatibility aliases and which can move directly to product-oriented `/api/admin/*` paths.

### Phase 3: Move Active Runtime Code

Status: complete

- [x] Move active feature code out of `packages/server/src/plugins/core-plugins/*`.
- [x] Move `packages/server/src/plugins/cache` into a non-plugin cache feature or service module.
- [x] Move `packages/server/src/plugins/available/magic-link-auth` into the auth feature area.
- [x] Move Turnstile service and middleware into a non-plugin security/forms feature area.
- [x] Update imports in `packages/server/src/app.ts`, routes, middleware, tests, and docs-adjacent code.

### Phase 4: Replace Plugin Naming in Runtime Contracts

Status: complete

- [x] Remove `WorkerBlogConfig.plugins` and `packages/server/src/config/plugins.ts`.
- [x] Update bootstrap comments and any remaining runtime references to plugin initialization.
- [x] Keep route and event compatibility where current admin/API clients still use plugin-shaped paths or events.
- [x] Defer route renames for admin navigation and shared metadata to a separate compatibility-breaking cleanup.

### Phase 5: Remove Manifests and Dead Artifacts

Status: complete

- [x] Delete manifest JSON files after their metadata is either unused or moved into explicit feature metadata.
- [x] Delete inactive examples and placeholder plugins that are not part of reachable product functionality.
- [x] Delete docs inside `packages/server/src/plugins` after useful content is moved or no longer needed.
- [x] Remove `packages/server/src/plugins` once no source imports, tsconfig excludes, tests, or docs require it.

### Phase 6: Admin and API Compatibility Verification

Status: complete

- [x] Verify admin SPA build still works for AI Search, Stripe, Security Audit, Analytics, Workflow, Cache, Database Tools, and Seed Data paths.
- [x] Verify auth-related moved modules compile for OAuth, OTP, magic link, user profiles, and Turnstile-protected forms.
- [x] Verify content rendering imports still resolve global variables and shortcode/editor integrations selected for retention.
- [x] Run focused server tests for moved modules.

### Phase 7: Final Validation and Cleanup

Status: complete

- [x] Run `pnpm type-check`.
- [x] Run relevant server and admin test suites/builds.
- [x] Run `rg "src/plugins|../plugins|./plugins|plugins/" packages/server packages/admin packages/shared` and resolve remaining runtime references in server source.
- [x] Confirm `find packages/server/src -path '*plugins*'` returns no server source directory intended for removal.
- [x] Update this plan and progress log with completion notes.

## Decisions

- Preserve product functionality first; deleting the directory is the last step.
- Treat existing plugin modules as built-in features, not installable plugins.
- Do not reintroduce a generic plugin settings/config layer.
- Keep existing API routes temporarily when needed to avoid breaking the current admin SPA during the move.
- Remove manifest files once no runtime or admin surface consumes them.

## Risks

| Risk | Mitigation |
| --- | --- |
| Hidden imports from tests or docs cause build failures after moving files. | Use `rg` before and after each move, then run focused tests. |
| Admin SPA depends on `/api/plugins/*` paths. | Keep compatibility route paths first, then optionally rename in a separate phase. |
| Turnstile, auth, cache, and content rendering are cross-cutting. | Move these in small batches with focused tests after each batch. |
| Docs and migrations still mention plugin terminology. | Separate runtime cleanup from historical migration/doc wording; only runtime blockers gate deletion. |

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| `pnpm type-check` fails in `packages/server/src/plugins/core-plugins/user-profiles/index.ts` because `c.get('user')` is not typed for that local Hono route and some user fields are optional. | After first database-tools/seed-data migration slice. | Resolved by moving user profiles to `packages/server/src/features/user-profiles`, typing its Hono instance with app bindings/variables, and guarding missing `userId`. |
| `pnpm type-check` fails in `packages/server/src/features/email-templates/*` after moving from `plugins/available`. | After removing `packages/server/src/plugins`. | Resolved by shortening relative imports from `../../../middleware`/`../../../db` to `../../middleware`/`../../db`. |
