# Development Guide

## Before Changing Code

1. Read `AGENTS.md`.
2. Check current `git status --short`.
3. Preserve unrelated user changes.
4. Identify package ownership before editing.
5. Put reusable contracts/utilities in `packages/shared`.

## Where To Put New Code

| Need | Location |
| --- | --- |
| Shared request/response contract | `packages/shared/src/admin-api/` or relevant shared folder |
| Shared zod schema | `packages/shared` |
| Shared pure utility | `packages/shared/src/utils/` |
| Hono route | `packages/server/src/routes/` or `packages/server/src/features/<feature>/routes/` |
| DB/domain mutation logic | `packages/server/src/services/` or feature service |
| Cloudflare binding/runtime logic | `packages/server` |
| Admin page | `packages/admin/src/pages/` |
| Admin API hook | `packages/admin/src/api/` |
| Admin UI primitive | `packages/admin/src/components/ui/` |
| Rich editor behavior | `packages/editor` |

## Content Change Checklist

When changing content behavior:

1. Update shared content contracts in `packages/shared/src/admin-api/contents.ts`.
2. Update server validation and route mapping.
3. Update domain logic in `packages/server/src/services/contents-domain.ts`.
4. Preserve `bodyJson` as source of truth.
5. Generate `bodyHtml` server-side only.
6. Update version snapshot behavior if persisted fields change.
7. Update media reference handling if body/cover references change.
8. Add or update tests.

## Data Model Change Checklist

1. Update `packages/server/src/db/schema.ts`.
2. Add a new migration file; do not edit existing migrations.
3. Update shared contracts if API shape changes.
4. Update route/service SQL.
5. Update tests.
6. Run D1 local migration before manual testing.

## API Change Checklist

1. Prefer shared zod schemas and TypeScript interfaces in `packages/shared`.
2. Import the same schema in server and admin.
3. Update Admin API hooks.
4. Update Bruno request if endpoint is part of the runnable API surface.
5. Update `docs/api.md`.

## Frontend Change Checklist

1. Follow existing page/API hook/component patterns.
2. Use `adminFetch()` for Admin API calls.
3. Use TanStack Query hooks in `packages/admin/src/api/`.
4. Keep page-specific UI in page/components folders.
5. Use existing local shadcn-style primitives before adding new UI.
6. Use `@worker-blog/editor` for rich text editing.

## Verification Commands

Focused package checks:

```bash
pnpm --filter @worker-blog/shared test
pnpm --filter @worker-blog/server test
pnpm --filter @worker-blog/admin test
pnpm --filter @worker-blog/editor test
```

Type checks:

```bash
pnpm --filter @worker-blog/admin type-check
pnpm --filter @worker-blog/editor type-check
./node_modules/.pnpm/node_modules/.bin/tsc --noEmit -p packages/shared/tsconfig.json
./node_modules/.pnpm/node_modules/.bin/tsc --noEmit -p packages/server/tsconfig.json
```

Full-ish checks:

```bash
pnpm build
pnpm -r --if-present test
git diff --check
```

## Common Pitfalls

- Do not write client-provided `bodyHtml`; server owns it.
- Do not expose `bodyJson` from public content detail.
- Do not bypass setup guard behavior for normal API routes.
- Do not duplicate shared request schemas in Admin or Server.
- Do not forget CSRF behavior for browser mutating requests.
- Do not assume a feature route is mounted just because a feature folder exists; confirm `app-registration.ts`.
- Do not edit existing migrations.
