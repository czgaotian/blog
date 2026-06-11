# Usage

## Prerequisites

- Node.js 18 or newer.
- pnpm 10.33.2, as declared in root `package.json`.
- Wrangler for Cloudflare Workers/D1/R2/KV workflows. It is available through package scripts.

## Install

```bash
pnpm install
```

## Local Database Migration

Apply D1 migrations locally:

```bash
pnpm --filter @worker-blog/server db:migrate:local
```

Do not modify existing migration files after data model changes. Add a new migration when a schema change is needed.

## Start Development Server

Root command:

```bash
pnpm dev
```

This delegates to `@worker-blog/server`, whose `dev` script delegates to `@worker-blog/admin dev`. The Admin Vite config uses the Cloudflare Vite plugin with `packages/server/wrangler.toml`, so the app runs with the Worker bindings and Admin SPA together.

The Admin SPA is served from `/`. API requests use `/api/*`. Public files use `/files/*`.

## First Admin Setup

On an empty database:

1. Visit `/auth/register`, or call `POST /api/auth/register`.
2. Register creates the first admin account only while the `users` table is empty.
3. After a user exists, registration returns 403.
4. Login at `/auth/login` or `POST /api/auth/login`.

Most API routes are blocked by setup guard until the first admin exists. The guard returns HTTP 428 with code `SETUP_REQUIRED`.

## Build

Build all packages that expose a build script:

```bash
pnpm build
```

Admin build:

```bash
pnpm --filter @worker-blog/admin build
```

Server build delegates to Admin build because Worker deployment serves Admin assets from `packages/admin/dist`.

## Tests

Run all package tests that expose a test script:

```bash
pnpm -r --if-present test
```

Focused tests:

```bash
pnpm --filter @worker-blog/shared test
pnpm --filter @worker-blog/server test
pnpm --filter @worker-blog/admin test
pnpm --filter @worker-blog/editor test
```

Type checks:

```bash
pnpm type-check
pnpm --filter @worker-blog/admin type-check
pnpm --filter @worker-blog/editor type-check
./node_modules/.pnpm/node_modules/.bin/tsc --noEmit -p packages/shared/tsconfig.json
./node_modules/.pnpm/node_modules/.bin/tsc --noEmit -p packages/server/tsconfig.json
```

## Deployment

Admin package deploy command:

```bash
pnpm --filter @worker-blog/admin deploy
```

This builds Admin and runs Wrangler deploy using `packages/server/wrangler.toml`.

Dry-run check:

```bash
pnpm --filter @worker-blog/admin check
```

## Bruno API Collection

Bruno requests live in `bruno/`.

Recommended local flow:

1. Select the `local` environment.
2. On an empty DB, run `Auth/Register` once.
3. Run `Auth/Login`.
4. Ensure the returned JWT is saved into the `authToken` environment variable.
5. Run Content, Media, Settings, Logs, Security Audit, or Analytics requests.

Mutating Bruno admin requests use `Authorization: Bearer {{authToken}}`, so they do not need the browser CSRF header.
