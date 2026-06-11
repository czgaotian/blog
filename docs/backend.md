# Backend

## Stack

- Runtime: Cloudflare Workers.
- HTTP framework: Hono.
- Database: Cloudflare D1 with Drizzle schema definitions.
- Object storage: Cloudflare R2.
- Cache/state: Cloudflare KV.
- Validation: zod, mostly imported from `@worker-blog/shared/admin-api`.
- Tests: Vitest.

## Important Files

| File | Responsibility |
| --- | --- |
| `packages/server/src/index.ts` | Default Worker export |
| `packages/server/src/app.ts` | Hono app factory |
| `packages/server/src/app-registration.ts` | Middleware and route registration |
| `packages/server/src/types/app.ts` | Bindings, Hono variables, app config |
| `packages/server/src/db/schema.ts` | Drizzle table definitions and inferred DB types |
| `packages/server/src/config/env.ts` | Runtime env parsing |
| `packages/server/wrangler.toml` | Cloudflare Worker, D1, R2, KV, assets config |

## Core Routes

Mounted by `registerCoreApiRoutes()`:

| Mount | Module | Purpose |
| --- | --- | --- |
| `/api` | `routes/api.ts` | Public API root, health, content list, category/tag public lists |
| `/api/media` | `routes/api-media.ts` | Authenticated media list/upload/update/delete |
| `/api/admin/profile` | `routes/admin-api-profile.ts` | Current user profile/password/avatar |
| `/api/admin` | `routes/admin-api.ts` | Dashboard, logs, settings, stats, storage, activity |
| `/api/admin/categories` | `routes/admin-api-categories.ts` | Category CRUD |
| `/api/admin/contents` | `routes/admin-api-contents.ts` | Admin content CRUD/versioning |
| `/api/admin/tags` | `routes/admin-api-tags.ts` | Tag CRUD |

Mounted by `registerFeatureRoutes()`:

| Mount | Module | Purpose |
| --- | --- | --- |
| `/api/security-audit` | `features/security-audit/routes/api.ts` | Security audit data endpoints |
| `/api/admin/security-audit` | `features/security-audit/routes/admin-api.ts` | Admin security audit dashboard/actions |
| `/api/events` | `features/analytics/routes/api.ts` | Public event tracking plus admin event reads |
| `/api/admin/analytics` | `features/analytics/routes/admin-api.ts` | Admin analytics dashboard |

Mounted by `registerAssetsAndFallbackRoutes()`:

| Route | Purpose |
| --- | --- |
| `/api/auth/*` | Register, login, logout, session, refresh |
| `/files/*` | Public R2 object streaming |
| `/api/health` | App health metadata |
| `/*` | SPA fallback for Admin assets |

## Auth and Security

- First admin registration: `POST /api/auth/register`, allowed only while no users exist.
- Login: `POST /api/auth/login`, validates password, returns JWT, sets `auth_token` and `csrf_token` cookies.
- Session: `GET /api/auth/session` and legacy `GET /api/auth/me`.
- Refresh: `POST /api/auth/refresh`, accepts valid or recently expired JWT within grace window.
- Logout: `POST /api/auth/logout` or `GET /api/auth/logout`.
- Password hashing: PBKDF2 via Web Crypto in `AuthManager`.
- JWT default TTL: 30 days unless env/settings override.
- CSRF: mutating browser requests must include `X-CSRF-Token` matching the readable `csrf_token` cookie.
- Admin auth: global `/api/admin/*` guard requires authentication and admin role by default.

## Services

| Service | Purpose |
| --- | --- |
| `contents-domain.ts` | Content create/update/delete/version/restore, media references, cache invalidation |
| `content-renderer.ts` | Re-exports editor Tiptap JSON to HTML renderer |
| `category-domain.ts` | Category create/update/delete constraints |
| `tag-domain.ts` | Tag create/update/delete constraints |
| `settings.ts` | General/security settings persistence |
| `cache.ts` and `cache-keys.ts` | KV-backed cache abstraction |
| `logger.ts` | System logging helpers |
| `telemetry-service.ts` | Telemetry ID and event support |
| `auth-validation.ts` | Admin existence checks for setup guard |

## Middleware

| Middleware | Purpose |
| --- | --- |
| `metrics.ts` | Per-request metrics |
| `setup-guard.ts` | Blocks API until first admin exists |
| `request-context.ts` | Request ID/start-time variables |
| `request-logging.ts` | Optional durable request logs |
| `security-headers.ts` | Security response headers |
| `csrf.ts` | CSRF token generation/checks |
| `auth.ts` | JWT, cookies, role checks, password hashing |
| `rate-limit.ts` | KV/in-memory style rate limiting helpers |

## Storage and Files

Media metadata lives in D1 table `media`. File bytes live in R2 `MEDIA_BUCKET`.

Upload flow:

1. Authenticated request sends multipart file to `/api/media/upload` or `/api/media/upload-multiple`.
2. Server validates type and size.
3. Server hashes file with SHA-256 to detect active duplicates.
4. Server writes object to R2 with content metadata.
5. Server inserts media metadata into D1.
6. Public URL is `/files/<r2_key>`.

`/files/*` streams from R2 with content type, content disposition, long cache, and permissive CORS headers.

## Current Backend Gap To Verify

`features/user-profiles/index.ts` implements user profile schema/custom-data routes, and Admin client calls `/api/user-profiles/*`, but `app-registration.ts` currently does not mount this feature. Add/verify route registration before treating `/api/user-profiles/*` as available.
