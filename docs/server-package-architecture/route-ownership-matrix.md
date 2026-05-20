# Server Route Ownership Matrix

Last updated: 2026-05-20

This matrix documents the mounted server route surfaces after the app registration extraction. It is a review aid for future route edits: route files may still preserve compatibility response shapes, but each row names the current owner module and the runtime surface it represents.

## Core Middleware

| Surface | Owner | Notes |
| --- | --- | --- |
| `*` metrics | `src/middleware/metrics.ts` | In-memory request metrics only. |
| `*` bootstrap | `src/middleware/bootstrap.ts` | Controlled by `BOOTSTRAP_MODE`; `auto` is the default. |
| custom before-auth middleware | caller config | Runs before request context, security, CSRF, and auth guards. |
| `*` request context | `src/middleware/request-context.ts` | Adds `requestId`, `startTime`, and response headers. |
| `*` durable request logging | `src/middleware/request-logging.ts` | Opt-in via `REQUEST_LOGGING_ENABLED`; logs sanitized context only. |
| `*` security headers | `src/middleware/security-headers.ts` | Shared response hardening. |
| `*` CSRF protection | `src/middleware/csrf.ts` | Protects cookie-authenticated unsafe methods except explicit public/auth exemptions. |
| custom after-auth middleware | caller config | Runs before admin auth guards. |
| `/api/admin/*` auth guard | `src/middleware/auth.ts` | Requires authenticated user and configured admin role. |

## Core API Routes

| Mounted path | Owner module | Surface |
| --- | --- | --- |
| `/api` | `src/routes/api.ts` | Public API discovery, `/api/health`, public content reads, public collection reads, headless content CRUD adapter. |
| `/api/media` | `src/routes/api-media.ts` | Public media API. |
| `/api/system` | `src/routes/api-system.ts` | System diagnostics. |
| `/api/admin/collections` | `src/routes/admin-api-collections.ts` | Canonical admin collection and field routes. |
| `/api/admin/profile` | `src/routes/admin-api-profile.ts` | Admin profile routes. |
| `/api/admin` | `src/routes/admin-api.ts` | Legacy/admin aggregate routes, including compatibility collection adapters still present. |
| `/api/forms` | `src/routes/public-forms.ts` | Public form routes. |
| `/api/admin/database-tools` | `src/features/database-tools/admin-routes.ts` | Admin database tools feature routes. |
| `/api/admin/seed-data` | `src/features/seed-data/admin-routes.ts` | Admin seed-data feature routes. |
| `/api/admin/content` | `src/routes/admin-api-content.ts` | Admin content routes backed by content-domain mutation behavior. |
| `/api/admin/forms` | `src/routes/admin-api-forms.ts` | Admin form routes. |
| `/api/admin/media` | `src/routes/admin-api-media.ts` | Admin media routes. |

## Built-In Feature Routes

| Feature | Owner registry | Mounted paths | Notes |
| --- | --- | --- | --- |
| Security Audit | `preCacheBuiltInFeatureRegistry` | `/api/security-audit`, `/api/plugins/security-audit` | Plugin-era path is a compatibility alias. |
| AI Search | `preCacheBuiltInFeatureRegistry` | `/api/search`, `/api/plugins/ai-search` | Plugin-era path is a compatibility alias. |
| Cache | `app-registration.ts` direct mount | `/api/admin/cache` | Uses built-in cache feature routes. |
| OAuth Providers | `postCacheBuiltInFeatureRegistry` | `/api/auth/oauth` | Auth route is mounted directly because it already starts with `/api/`. |
| User Profiles | `postCacheBuiltInFeatureRegistry` | `/api/user-profiles` | Built-in feature surface. |
| OTP Login | `postCacheBuiltInFeatureRegistry` | `/api/auth/otp` | Auth route is mounted directly because it already starts with `/api/`. |
| Analytics | `postCacheBuiltInFeatureRegistry` and direct events mount | `/api/analytics`, `/api/plugins/analytics`, `/api/events` | Plugin-era path is a compatibility alias; public events route is direct. |
| Workflow | `postCacheBuiltInFeatureRegistry` | `/api/workflow`, `/api/plugins/workflow` | Plugin-era path is a compatibility alias. |
| Stripe | `postEventsBuiltInFeatureRegistry` | `/api/stripe`, `/api/plugins/stripe` | Plugin-era path is a compatibility alias. |
| Email | `lateBuiltInFeatureRegistry` | `/api/admin/email` | Late mount, after auth/test-cleanup routes. |
| Magic Link | `createMagicLinkAuthFeature()` | `/api/auth/magic-link` | Registered late as a built-in auth feature. |

## Assets And Fallbacks

| Mounted path | Owner module | Surface |
| --- | --- | --- |
| `/` and `/admin/*` | `src/routes/admin-spa.ts` | Admin SPA assets and navigation fallback. |
| `/api/auth` | `src/routes/auth.ts` | Core auth routes. |
| `/` test cleanup | `src/routes/test-cleanup.ts` | Development/test cleanup routes. |
| `/favicon.svg` | `src/assets/favicon.ts` | Static favicon response. |
| `/files/*` | `app-registration.ts` | Public R2 file serving. |
| caller custom routes | caller config | User-defined route mounts. |
| `/` | `app-registration.ts` | Root redirect to `/admin`. |
| `/api/health` | `src/routes/api.ts` | Current public health response; the later app-level health handler is shadowed by the `/api` route mount. |

## Compatibility Notes

- `/api/plugins/*` paths are intentional compatibility aliases until Phase 13/17 makes an explicit deprecation or removal decision.
- Duplicate collection route behavior remains documented in `collection-route-inventory.md`; legacy handlers should stay thin adapters over `collection-domain.ts`.
- Public `/api/content` mutations still preserve headless compatibility behavior through explicit content-domain modes.
