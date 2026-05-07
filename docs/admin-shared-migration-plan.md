# Admin and Shared Package Migration Plan

## Current Status

Phase 1 and phase 2 are complete.

- `server` imports admin rendering code through `@worker-blog/admin/templates`.
- `server/src/templates` has been removed.
- `server` imports shared contracts and utilities through `@worker-blog/shared`.
- Duplicate shared utility/type files have been removed from `server`.
- `server` keeps only server-specific compatibility files under `src/utils`, `src/types`, and `src/schemas`.

## Completed Phase 1: Admin Extraction

- Added explicit package exports for `@worker-blog/admin`.
- Migrated server admin template imports to `@worker-blog/admin/templates/...`.
- Updated plugin templates that used global admin layouts to import from `@worker-blog/admin/templates`.
- Deleted the duplicate `packages/server/src/templates` tree.

## Completed Phase 2: Shared Extraction

- Added explicit package exports for `@worker-blog/shared`.
- Migrated server imports for generic plugin, collection, telemetry, query filter, metrics, sanitize, blocks, and template-renderer code to `@worker-blog/shared`.
- Updated server compatibility entrypoints:
  - `packages/server/src/types/index.ts` re-exports shared types plus server-specific plugin aliases.
  - `packages/server/src/utils/index.ts` re-exports shared utilities while preserving server package version exports.
- Removed duplicated shared files from `packages/server/src/utils` and `packages/server/src/types`.

## Remaining Intentional Server Files

These are intentionally kept in `server`:

- `packages/server/src/utils/version.ts`: reads the server package version, not the shared package version.
- `packages/server/src/types/plugin-types.ts`: server compatibility alias for plugin DB service typing.
- `packages/server/src/types/workers-shim.d.ts`: Cloudflare Worker runtime shims.
- `packages/server/src/schemas/index.ts`: server API schema exposure path, kept separate for now.

## Validation

Use these commands after future package-boundary changes:

```sh
pnpm type-check
pnpm --filter @worker-blog/server test
```

Current validation after phase 2:

- `pnpm type-check` passes.
- `pnpm --filter @worker-blog/server test` passes.
