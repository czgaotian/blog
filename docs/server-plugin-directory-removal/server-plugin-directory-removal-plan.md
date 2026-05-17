# Server Plugin Directory Removal Plan

## Objective

Remove `packages/server/src/plugins` without losing existing functionality.

This is a feature migration, not a blind directory deletion. The directory currently holds real runtime code for auth, search, analytics, payments, cache, security, forms, email, workflow, and admin tooling. The implementation must move or retire each piece deliberately, then delete the directory only after verification.

## Target Architecture

Server features should live in explicit product-oriented modules:

```text
packages/server/src/features/<feature-name>
packages/server/src/routes/<route-name>.ts
packages/server/src/services/<service-name>.ts
packages/server/src/middleware/<middleware-name>.ts
```

The codebase should no longer expose or consume:

- `packages/server/src/plugins`
- `WorkerBlogConfig.plugins`
- `packages/server/src/config/plugins.ts`
- plugin manifests as runtime metadata
- install/activate/deactivate plugin semantics
- `../plugins/...` or `./plugins/...` imports from server runtime code

Compatibility route paths such as `/api/plugins/ai-search` can remain temporarily if the current admin SPA depends on them. They should be treated as API compatibility paths, not evidence of a plugin architecture.

## Workstream 1: Runtime Inventory

Create a precise inventory before moving files.

Required checks:

```bash
find packages/server/src/plugins -type f | sort
rg -n "\.\./plugins|\.\/plugins|src/plugins|@worker-blog/server/plugins|plugins/" packages/server/src packages/admin/src packages/shared/src packages/server/tsconfig.json
```

Classify every item:

| Category | Meaning | Action |
| --- | --- | --- |
| Active feature | Imported by runtime or admin routes | Move to `features` or existing domain modules |
| Cross-cutting service | Used by routes/middleware | Move to `services`, `middleware`, or feature-owned service |
| Admin tooling | Database tools, seed data, cache admin | Move to explicit admin feature routes |
| Editor integration | TinyMCE, Quill, EasyMDE adapters | Keep only if still used, but move out of `plugins` |
| Example/demo | Hello world, demo-only manifests | Delete unless tests prove it is required |
| Manifest-only | Metadata not consumed by runtime | Delete or convert to static feature metadata |
| Docs-only | README/completion reports | Move useful content to `docs` or delete |

## Workstream 2: Move Active Features

Recommended move order:

1. Low-coupling admin tooling:
   - `database-tools-plugin` -> `features/database-tools`
   - `seed-data-plugin` -> `features/seed-data`

2. Runtime services with focused tests:
   - `cache` -> `features/cache`
   - `global-variables-plugin` -> `features/global-variables`
   - `turnstile-plugin` -> `features/turnstile`

3. Auth-related features:
   - `oauth-providers` -> `features/auth/oauth-providers`
   - `otp-login-plugin` -> `features/auth/otp-login`
   - `available/magic-link-auth` -> `features/auth/magic-link`
   - `user-profiles` -> `features/user-profiles` or `features/auth/user-profiles`

4. Large admin/API features:
   - `ai-search-plugin` -> `features/ai-search`
   - `analytics` -> `features/analytics`
   - `security-audit-plugin` -> `features/security-audit`
   - `stripe-plugin` -> `features/stripe`
   - `workflow-plugin` -> `features/workflow`

5. Confirm or remove remaining modules:
   - `redirect-management`
   - `design`
   - `email-templates-plugin`
   - editor adapters and manifest-only folders

After each batch:

```bash
rg -n "\.\./plugins|\.\/plugins|src/plugins" packages/server/src
pnpm --filter @worker-blog/server test -- <focused-pattern>
pnpm type-check
```

## Workstream 3: Update App Wiring

Update `packages/server/src/app.ts` so all imports come from new feature modules.

Current examples to replace:

```ts
import { aiSearchFeature } from './plugins/core-plugins/ai-search-plugin'
import cachePlugin from './plugins/cache'
import { createMagicLinkAuthFeature } from './plugins/available/magic-link-auth'
```

Target shape:

```ts
import { aiSearchFeature } from './features/ai-search'
import cacheFeature from './features/cache'
import { createMagicLinkAuthFeature } from './features/auth/magic-link'
```

Also update direct route imports:

- `packages/server/src/routes/public-forms.ts`
- `packages/server/src/routes/auth.ts`
- `packages/server/src/routes/api-content-crud.ts`

## Workstream 4: Remove Plugin Config Surface

Remove config that only exists to point at `src/plugins`.

Files and symbols:

- Delete `packages/server/src/config/plugins.ts`.
- Remove `pluginConfig` import from `packages/server/src/config/app.ts`.
- Remove `plugins` from `WorkerBlogConfig`.
- Update bootstrap comments that still mention plugin initialization.
- Confirm no code path reads `config.plugins`.

Potential compatibility note:

If public API consumers pass `plugins` into `createWorkerBlogApp`, decide whether to remove immediately or keep a deprecated ignored field for one release. For this repository cleanup, the preferred end state is no `plugins` field.

## Workstream 5: API Path Strategy

Do not combine file movement with broad API path changes unless necessary.

Initial compatibility:

- Keep `/api/plugins/ai-search`, `/api/plugins/stripe`, `/api/plugins/security-audit`, `/api/plugins/analytics`, and `/api/plugins/workflow` working.
- Keep current admin SPA routes working while files move.

Optional later cleanup:

- Move admin-visible feature pages away from `/admin/plugins/*`.
- Move API paths to `/api/admin/<feature>` or product-specific public paths.
- Update `packages/admin/src/api/*`, router, nav, and `packages/shared/src/routes/metadata.ts`.

## Workstream 6: Delete or Move Non-Runtime Artifacts

Before deleting `packages/server/src/plugins`, resolve:

- `packages/server/tsconfig.json` excludes pointing to plugin files.
- READMEs under plugin folders.
- Manifest JSON files.
- Tests under plugin folders.
- Route metadata references.
- Docs that show import paths from `@worker-blog/server/plugins`.

Useful docs should move to:

```text
docs/features/<feature-name>.md
docs/server-plugin-directory-removal/archive-notes.md
```

## Acceptance Criteria

- `packages/server/src/plugins` no longer exists.
- No server runtime imports point to `plugins`.
- `WorkerBlogConfig.plugins` and `packages/server/src/config/plugins.ts` are removed.
- Existing feature routes still respond or have documented compatibility redirects/aliases.
- Admin SPA builds and its existing feature pages still load.
- Focused server tests pass for moved features.
- `pnpm type-check` passes.
- Final search has no unexpected runtime references:

```bash
rg -n "\.\./plugins|\.\/plugins|src/plugins|@worker-blog/server/plugins" packages/server packages/admin packages/shared
```

## Suggested First Implementation Slice

Start with a small slice to prove the pattern:

1. Move `database-tools-plugin` to `features/database-tools`.
2. Move `seed-data-plugin` to `features/seed-data`.
3. Update `packages/server/src/app.ts` imports.
4. Run focused tests and type-check.
5. Record import update pattern in `findings.md`.

This slice is small, admin-only, and should expose path alias or barrel export issues before touching cross-cutting auth/cache/search behavior.

