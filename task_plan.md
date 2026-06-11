# Content Body JSON/HTML Server Plan

## Goal

Evolve content storage so Tiptap JSON is the source of truth and cached HTML is generated server-side for public rendering.

## Scope

- Packages: `packages/shared`, `packages/server`.
- Do not modify admin implementation.
- Do not modify existing migration files.
- Keep `body_json` as source of truth and `body_html` as generated cache.

## Phases

1. Inventory current content contracts, schema, routes, domain service, and tests. Status: complete.
2. Add shared Tiptap body schemas and update shared content request/response contracts. Status: complete.
3. Update server DB schema and content domain write/version/restore behavior. Status: complete.
4. Add server-side Tiptap JSON to sanitized HTML renderer and publish-time cache updates. Status: complete.
5. Update admin/public content routes to expose the right JSON/HTML boundaries. Status: complete.
6. Update focused tests and run verification. Status: complete.

## Decisions

- Shared contracts use `bodyJson` for editable content and `bodyHtml` for generated/public content.
- Server create/update accepts `bodyJson`; client-provided `bodyHtml` is not part of write schemas.
- Publishing is represented by status transition to `published`; server regenerates `body_html` from `body_json`.
- Draft edits do not clear existing `body_html`; the public API should only serve published content.
- Version snapshots store `bodyJson`, not `bodyHtml`, as content truth.

## Verification

- `pnpm --filter @worker-blog/shared test -- contents.test.ts` passed.
- `pnpm --filter @worker-blog/server test -- content-renderer.test.ts contents-domain.test.ts admin-api-contents.test.ts` passed.
- `tsc --noEmit -p packages/shared/tsconfig.json` passed.
- `tsc --noEmit -p packages/server/tsconfig.json` passed.
- `git diff --check` passed.
- Root `pnpm type-check` is blocked by the existing script referencing missing `packages/editor/tsconfig.json`.

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| Root `pnpm type-check` fails because `packages/editor/tsconfig.json` does not exist. | Ran root type-check after focused tests. | Verified this task's changed packages with direct shared/server TypeScript commands. |

## Documentation Architecture Task

Goal: Generate AI-readable project documentation under `docs/` covering complete design, usage, and architecture.

Phases:

1. Inventory repository structure, scripts, packages, and existing docs. Status: complete.
2. Inventory server routes, features, database schema, middleware, and Cloudflare runtime resources. Status: complete.
3. Inventory admin UI, editor package, shared contracts, and Bruno API collection. Status: complete.
4. Write focused docs files under `docs/` with stable paths and concise architecture notes. Status: complete.
5. Review generated docs for completeness, consistency, and AI readability. Status: complete.
