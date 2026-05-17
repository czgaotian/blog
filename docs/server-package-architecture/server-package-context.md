# Server Package Context For AI Agents

Last researched: 2026-05-17

This document summarizes `packages/server` so a future AI agent can start optimization work with the right mental model. Treat this as context, not executable instructions.

## Purpose

`packages/server` is the Cloudflare Worker backend for Worker Blog. It owns the Hono app, Worker bindings, D1 schema/migrations, core REST APIs, auth/session behavior, R2 media access, bootstrap/sync logic, and several built-in feature slices.

The package is coupled to:

- `packages/admin`: React admin UI. Its Vite Cloudflare plugin runs/deploys the Worker using `packages/server/wrangler.toml`.
- `packages/shared`: shared admin API contracts, collection types, route metadata, sanitizers, telemetry/logging types, query filtering utilities, slug helpers, and version helpers.

## How To Run

From the repository root:

```bash
pnpm install
pnpm --filter @worker-blog/server db:migrate:local
pnpm dev
```

Useful server commands:

```bash
pnpm --filter @worker-blog/server dev
pnpm --filter @worker-blog/server build
pnpm --filter @worker-blog/server check
pnpm --filter @worker-blog/server deploy
pnpm --filter @worker-blog/server test
pnpm --filter @worker-blog/server db:migrate:local
pnpm --filter @worker-blog/server db:reset
```

Important nuance: `@worker-blog/server` delegates `dev`, `build`, `check`, `preview`, and `deploy` to `@worker-blog/admin`. This is intentional: the admin Vite config uses `@cloudflare/vite-plugin` with `configPath: '../server/wrangler.toml'`, so the Worker and admin assets run together.

## Runtime Entrypoint

Main files:

- `packages/server/wrangler.toml`: Cloudflare Worker config. `main = "src/index.ts"`.
- `packages/server/src/index.ts`: registers the default blog post collection, then exports `createWorkerBlogApp(appConfig)`.
- `packages/server/src/app.ts`: central Hono application factory.
- `packages/admin/vite.config.ts`: points Cloudflare Vite plugin at the server wrangler config.

Cloudflare bindings declared by `app.ts`/wrangler include:

- `DB`: D1 database.
- `CACHE_KV`: KV namespace for cache/security features.
- `MEDIA_BUCKET`: R2 bucket for media files.
- `ASSETS`: static admin asset fetcher.
- Optional env/secrets for JWT, CORS, email providers, Stripe, OAuth, Turnstile, Cloudflare Images, etc.

Watch out: `requireAuth` currently reads `c.env.KV` for JWT verification caching, but wrangler and the app binding type expose `CACHE_KV`. Other code uses `CACHE_KV`. This likely means auth token verification caching is not using the configured KV binding unless another binding named `KV` exists.

## App Factory Flow

`createWorkerBlogApp(config)` builds one Hono app.

Middleware order:

1. Set `appName` and `appVersion` variables.
2. `metricsMiddleware()`.
3. `bootstrapMiddleware(config)`.
4. Optional `config.middleware.beforeAuth`.
5. Logging placeholder.
6. `securityHeadersMiddleware()`.
7. `csrfProtection()`.
8. Optional `config.middleware.afterAuth`.
9. Global `/api/admin/*` guard: `requireAuth()` then `requireRole(config.adminAccessRoles || ['admin'])`.
10. Route mounting.
11. Custom `config.routes`.
12. `/` redirects to `/admin`.
13. `/api/health`.
14. Store app instance for route introspection.
15. JSON 404 and JSON 500 handlers.

Bootstrap runs once per Worker instance. It:

- Runs bundled migrations through `MigrationService`.
- Syncs code-registered collections through `syncCollections`.
- Syncs form-derived shadow collections through `syncAllFormCollections`.
- Verifies security env, warning in development and failing production for critical JWT secret problems.

## Route Map

Core routes mounted in `app.ts`:

- `/api`: public API info, health, collection listing, public content reads, and `/api/content` CRUD.
- `/api/media`: legacy/headless media operations.
- `/api/system`: health/info/stats/ping/env diagnostics.
- `/api/auth`: register, login, logout, me, refresh, seed-admin, invitations, password reset.
- `/api/admin`: admin bootstrap/me, dashboard, logs, API reference, settings, users, stats, storage, activity, migrations, legacy collection endpoints.
- `/api/admin/collections`: admin collection/schema management.
- `/api/admin/content`: admin content management with versioning and soft delete.
- `/api/admin/forms`: form management.
- `/api/forms`: public form schema/config/submission endpoints.
- `/api/admin/media`: admin media library backed by R2 and `media`.
- `/api/admin/database-tools`, `/api/admin/seed-data`, `/api/admin/cache`: admin utility routes.
- `/api/events`: public event tracking plus admin event reads.
- `/admin`, `/admin/*`, `/admin/assets/*`: admin SPA shell/assets from `ASSETS`.
- `/files/*`: public R2 object serving from `MEDIA_BUCKET`.
- `/favicon.svg`: inline SVG favicon.
- `/test-cleanup*`: development/test cleanup routes.

Built-in feature routes mounted by feature descriptors:

- `/api/search`, `/api/plugins/ai-search`
- `/api/security-audit`, `/api/plugins/security-audit`
- `/api/analytics`, `/api/plugins/analytics`
- `/api/user-profiles`
- `/api/workflow`, `/api/plugins/workflow`
- `/api/stripe`, `/api/plugins/stripe`
- `/api/admin/email`
- OTP/OAuth/magic-link auth feature routes

Some feature folders contain plugin-style code or admin HTML that is not currently registered in `app.ts`; confirm route mounting before assuming a feature is live.

## Data Model

Primary Drizzle schema tables in `src/db/schema.ts`:

- `users`: auth/users/roles.
- `collections`: dynamic content model definitions. `schema` is JSON.
- `content`: content rows. `data` is JSON.
- `content_versions`: content version history.
- `media`: R2 file metadata and public URLs.
- `api_tokens`: programmatic access.
- `workflow_history`: content workflow transitions.
- `system_logs`, `log_config`: logging.
- `security_events`: auth/security audit records.
- `forms`, `form_submissions`, `form_files`: Form.io integration and submitted data.

Migrations:

- Top-level SQL migrations live in `packages/server/migrations`.
- Worker runtime uses generated `src/db/migrations-bundle.ts`.
- Bundled IDs seen after Phase 8 cleanup: 001-037.
- Top-level `packages/server/migrations/*.sql` is the canonical source. `pnpm --filter @worker-blog/server db:migrations:check` verifies bundle filename/order parity and fails if SQL files appear under `src/db/migrations`.

## Content And Collections

The content system is collection-driven:

- Code-managed collections are registered before app creation with `registerCollections`.
- Default registration is `src/collections/blog-posts.collection.ts`, named `blog-posts`.
- `bootstrapMiddleware` syncs registered collection configs into `collections`.
- Admin-created collections and fields update the collection JSON schema through `/api/admin/collections`.
- Normal admin collection/content lists filter out form-derived collections with `(source_type IS NULL OR source_type = 'user')`.

Public content reads:

- `/api/content`
- `/api/collections/:collection/content`

They use `QueryFilterBuilder` from `@worker-blog/shared/utils`. `normalizePublicContentFilter` strips caller-provided status filters for non-admin/editor roles and forces `status = 'published'`.

Admin content routes:

- Use shared schemas from `@worker-blog/shared/admin-api`.
- Create and update `content`.
- Create `content_versions` on creation and data changes.
- Delete by setting `status = 'deleted'`.

Headless `/api/content` CRUD:

- Requires auth for writes.
- Does not create versions.
- DELETE hard-deletes rows.

Treat admin and headless CRUD as distinct behavior surfaces when optimizing.

## Auth And Security

Auth lives mostly in `src/routes/auth.ts` and `src/middleware/auth.ts`.

- JWT can be supplied by `Authorization: Bearer ...` or `auth_token` cookie.
- Passwords use PBKDF2; legacy SHA-256 hashes are migrated during login.
- Cookie sessions get a signed double-submit `csrf_token`.
- JWT TTL reads `JWT_EXPIRES_IN` first, then `settings.security.jwtExpiresIn`, then defaults to 30 days.
- Refresh grace reads `JWT_REFRESH_GRACE_SECONDS`, then `settings.security.jwtRefreshGraceSeconds`, then defaults to 7 days.
- CSRF exempts safe methods, login/register/session creation routes, public forms, search, Stripe webhook, events, and Bearer/API-key-only requests.
- `securityAuditMiddleware` only intercepts `/api/auth/*`, logs auth events, and uses `CACHE_KV` for brute-force lockouts.

## Media And Assets

Admin media routes in `src/routes/admin-api-media.ts`:

- List/filter media from `media`.
- Upload multipart files to `MEDIA_BUCKET`.
- Insert metadata into `media`.
- Use `/files/<r2_key>` as public URL and thumbnail URL for images.
- Update metadata fields.
- On delete, attempt R2 delete then set `deleted_at`.

`/files/*` in `app.ts` reads directly from `MEDIA_BUCKET`, returns stored content metadata, sets long-lived cache headers, and allows CORS.

Admin SPA assets:

- wrangler `[assets]` points to `../admin/dist/client`.
- `/admin/assets/*` maps to `/assets/*` in `ASSETS` and gets immutable cache headers.
- `/admin` and other HTML-ish `/admin/*` requests serve `/index.html` with `no-store`.

## Forms

Public form routes live in `src/routes/public-forms.ts`.

- `GET /api/forms/:identifier/schema`: public Form.io schema.
- `GET /api/forms/:identifier/turnstile-config`: effective Turnstile config.
- `POST /api/forms/:identifier/submit`: validate optional Turnstile, sanitize string values recursively, insert `form_submissions`, update form count, then dual-write content through `createContentFromSubmission`.

`src/services/form-collection-sync.ts` creates shadow collections for forms:

- Collection name: `form_<form.name>`.
- `source_type = 'form'`, `source_id = form.id`, `managed = 1`.
- Schema is derived from Form.io components.
- Existing submissions without `content_id` can be backfilled.

## Cache

There are two cache layers/patterns:

- `src/services/cache.ts`: simple per-instance in-memory cache. Many public APIs call `getCacheService(CACHE_CONFIGS.api)`, but `getCacheService` returns a new service each call, so this should not be assumed to be a shared global cache.
- `src/features/cache`: richer feature module with memory/KV concepts, stats, warming, invalidation, and `/api/admin/cache` routes.

Also note `middleware/index.ts` currently exports `isPluginActive` as a stub that always returns `false`. Public API cache checks call `isPluginActive(c.env.DB, 'core-cache')`, so those checks currently disable that public API cache path unless this stub is replaced.

## Settings, Telemetry, Logs

- `SettingsService` wraps the `settings` table and stores JSON values by `category` + `key`.
- General settings default to Worker Blog naming, UTC, English, maintenance mode off.
- Security settings drive JWT expiry/grace when env vars do not override them.
- Logs use `system_logs`/`log_config`; admin log routes expose paginated logs and config.
- Telemetry has its own service/tests and sanitizes tracked properties.

## Testing And Type Checking

Server tests:

```bash
pnpm --filter @worker-blog/server test
```

Repo-wide type check:

```bash
pnpm type-check
```

Server package TypeScript config excludes tests and a few helper/client files. Tests are colocated beside routes/services/features and include route tests, bootstrap tests, collection sync, migrations, settings, cache, email templates, OTP, Turnstile, and telemetry.

## Optimization Notes

Good first optimization targets to inspect:

- Route duplication between legacy `admin-api.ts` collection endpoints and newer `admin-api-collections.ts`.
- Behavioral divergence between `/api/content` CRUD and `/api/admin/content`.
- Cache service semantics: repeated `getCacheService()` calls create independent in-memory maps in `src/services/cache.ts`.
- Binding consistency around `CACHE_KV` vs `KV`.
- Bootstrap cost on cold Worker instances: migrations and collection/form sync are attempted before normal requests once per instance.
- Migration bundle/source drift, especially raw `src/db/migrations/0010_oauth_accounts.sql`.
- Feature modules that still carry plugin-era names/routes after plugin platform table removal.
