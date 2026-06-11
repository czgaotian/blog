# Architecture

## System Shape

Worker Blog is a pnpm monorepo:

```text
packages/
  admin/   React Admin SPA
  editor/  Tiptap editor package
  server/  Cloudflare Worker backend
  shared/  Shared contracts, types, schemas, utilities
```

The deployed unit is a Cloudflare Worker configured by `packages/server/wrangler.toml`. The Worker serves API routes, streams uploaded media from R2, and serves the built Admin SPA from Worker Assets.

## Package Boundaries

### `packages/shared`

Use for code that is reused across packages or defines a shared contract:

- API request/response types.
- zod validation schemas shared by client and server.
- UI-independent utilities.
- route metadata, telemetry types, logging types.

### `packages/server`

Use for server runtime logic:

- Hono app factory and route registration.
- Cloudflare bindings and D1/R2/KV access.
- Auth, CSRF, setup guard, rate limits, metrics, request logging.
- Domain services for content, category, tag, settings, telemetry, cache.
- Feature modules such as analytics and security audit.

### `packages/admin`

Use for Admin presentation and browser behavior:

- React routes and pages.
- shadcn-style UI components.
- TanStack Query hooks and browser API client.
- Admin-only form logic and page-specific components.

### `packages/editor`

Use for rich text editor behavior:

- Tiptap extensions and editor React component.
- Editor toolbar and primitive UI.
- Image upload node and paste upload behavior.
- HTML rendering helper for Tiptap JSON.

## Worker App Lifecycle

1. `packages/server/src/index.ts` exports default app.
2. `packages/server/src/app.ts` creates a Hono app through `createWorkerBlogApp(config)`.
3. App metadata variables `appName` and `appVersion` are set per request.
4. `registerCoreMiddleware()` applies global middleware.
5. `registerCoreApiRoutes()` mounts core API/Admin routes.
6. `registerFeatureRoutes()` mounts feature APIs.
7. `registerAssetsAndFallbackRoutes()` adds auth, R2 file serving, custom routes, health, and SPA fallback.
8. Not-found and error handlers return JSON.

## Middleware Order

Defined in `packages/server/src/app-registration.ts`:

1. Metrics for all requests.
2. Setup guard for `/api` and `/api/*`.
3. Optional custom `beforeAuth` middleware.
4. Request context.
5. Optional durable request logging.
6. Security headers.
7. CSRF protection.
8. Optional custom `afterAuth` middleware.
9. Default `/api/admin/*` authentication.
10. Default `/api/admin/*` role gate.

This order matters. Setup guard runs before auth so an empty install can redirect Admin to registration.

## Cloudflare Resources

| Binding | Type | Purpose |
| --- | --- | --- |
| `DB` | D1 | users, content, taxonomies, media metadata, settings, logs, analytics, audit data |
| `MEDIA_BUCKET` | R2 | uploaded file objects |
| `CACHE_KV` | KV | cache and brute-force lockout state |
| `ASSETS` | Worker Assets Fetcher | built Admin SPA from `packages/admin/dist` |

## Content Lifecycle

1. Admin editor emits Tiptap `JSONContent`.
2. Admin API sends `bodyJson`.
3. Shared schemas validate the write request.
4. Server content domain stores `body_json`.
5. If content is published, server renders sanitized HTML into `body_html`.
6. Public detail endpoint returns `bodyHtml`, not editable `bodyJson`.
7. Admin detail endpoint returns both `bodyJson` and `bodyHtml`.
8. Version snapshots store `bodyJson` as source of truth.

## Extension Points

`createWorkerBlogApp(config)` accepts:

- `routes`: custom Hono route mounts.
- `middleware.beforeAuth`: custom global middleware before request context/security/auth.
- `middleware.afterAuth`: custom global middleware after CSRF.
- `adminAccessRoles`: default roles for `/api/admin/*`.
- `name` and `version`: app metadata.
