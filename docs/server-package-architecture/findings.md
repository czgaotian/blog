# Server Package Architecture Findings

## Running Notes

- Root package is `worker-blog-monorepo` using `pnpm@10.33.2`, with workspace packages under `packages/*`.
- Root `dev` script runs `pnpm --filter @worker-blog/server dev`.
- `@worker-blog/server` scripts delegate the runtime/build/check/preview/deploy commands to `@worker-blog/admin`, while database commands and tests are local to the server package.
- Server package declares Cloudflare Worker/Hono/Drizzle/Vitest dependencies and a `worker-blog-db-reset` binary.
- `packages/server` is a Cloudflare Worker backend with many feature modules under `src/features`, shared route modules under `src/routes`, D1 migrations under both `migrations/` and `src/db/migrations/`, and tests colocated beside routes/services/features.
- `packages/shared` provides shared admin API schemas, collection types, route metadata, telemetry/logging types, sanitizers, slug helpers, and version utilities used by server/admin.
- Worker entrypoint is `packages/server/src/index.ts`: it registers `blogPostsCollection`, then exports `createWorkerBlogApp(appConfig)`.
- `packages/server/src/app.ts` is the central Hono app factory. Middleware order: app metadata → metrics → bootstrap → custom before-auth middleware → logging placeholder → security headers → CSRF → custom after-auth middleware → admin auth/role guard → routes.
- `packages/server/wrangler.toml` has `main = "src/index.ts"` and Cloudflare assets binding pointing at `../admin/dist/client`. Admin Vite config uses `@cloudflare/vite-plugin` with `configPath: '../server/wrangler.toml'`.
- Running `pnpm dev` at repo root goes through server script to admin Vite. Admin Vite runs the Cloudflare Worker and serves `/admin` assets through the server wrangler config.
- Bootstrap runs once per Worker instance, skipping obvious static paths. It runs bundled D1 migrations, syncs code-registered collections, syncs form-derived collections, then verifies security-critical env.
- D1 migrations are bundled in `src/db/migrations-bundle.ts` for Worker runtime. IDs currently include 001-009 and 011-037; 010 is present as a raw `src/db/migrations/0010_oauth_accounts.sql` file but not in the top-level bundle list seen.
- Primary Drizzle schema tables: `users`, `collections`, `content`, `content_versions`, `media`, `api_tokens`, `workflow_history`, `system_logs`, `log_config`, `security_events`, `forms`, `form_submissions`, `form_files`.
- Route registration in `app.ts` includes core public API under `/api`, media/system routes, admin API families under `/api/admin`, public forms under `/api/forms`, admin SPA under `/admin`, auth under `/api/auth`, R2 file serving under `/files/*`, and built-in feature routes.
- Built-in feature route convention: routes with `/api/...` paths mount directly; routes with `/auth/...` would mount under `/api/auth/...`.
- Important binding mismatch spotted for future optimization: `Bindings` and wrangler use `CACHE_KV`, while `requireAuth` checks `c.env.KV` for JWT verification caching.
- Content model centers on `collections` plus `content.data` JSON. Code-managed collections are registered before app creation and synced at bootstrap; UI-created collections update the collection JSON schema through admin routes.
- Default registered collection is `blog-posts` from `src/collections/blog-posts.collection.ts`.
- Public content reads use `QueryFilterBuilder` from shared utils and `normalizePublicContentFilter`; anonymous/viewer/author requests cannot override status to read drafts/archived content, while admin/editor can.
- Admin content routes use shared admin API schemas, create `content_versions`, and soft-delete by setting `status = 'deleted'`.
- Headless CRUD routes under `/api/content` hard-delete on DELETE and do not create versions; this is a separate behavioral surface from `/api/admin/content`.
- Media admin routes upload to `MEDIA_BUCKET`, store metadata in `media`, expose public files through `/files/:key`, and soft-delete media rows after attempting R2 deletion.
- Public forms read/write `forms` and `form_submissions`, sanitize submitted strings, optionally verify Turnstile, then dual-write submissions into `content` via `createContentFromSubmission`.
- Form sync creates managed shadow collections named `form_<form.name>` with `source_type = 'form'`; normal content/collection admin lists filter these out unless using form-specific routes.
- Feature modules are mixed maturity: some are actively mounted built-ins (`ai-search`, `analytics`, `cache`, `email`, `otp`, `oauth`, `magic-link`, `security-audit`, `stripe`, `user-profiles`, `workflow`), while others contain plugin-style exports/admin HTML that are not registered in `app.ts`.
- Tests are colocated and run with `pnpm --filter @worker-blog/server test`. Coverage exists for routes, bootstrap, services, cache, email templates, Turnstile, OTP, settings, telemetry, and collection sync.

## Open Questions

- Does the raw OAuth migration `src/db/migrations/0010_oauth_accounts.sql` intentionally sit outside the bundled migration service?
- Should auth middleware use `CACHE_KV` instead of `KV`, or should wrangler expose both bindings?

## 2026-05-17 Optimization Planning Findings

- `packages/server/src/app.ts` is currently the main composition hotspot: middleware, admin guards, core routes, built-in feature routes, asset serving, R2 file serving, custom routes, health, and error handling are all registered in one factory.
- `packages/server/src/middleware/index.ts` exports compatibility stubs, including `isPluginActive: () => false`, while `packages/server/src/middleware/plugin-middleware.ts` implements `isPluginActive()` as `true` for migrated built-in functionality. Public API cache checks import from the middleware barrel, so this discrepancy can disable the intended cache path.
- The server has two cache implementations: `src/services/cache.ts` is a simple per-instance memory cache, while `src/features/cache/services/cache.ts` models memory plus KV, stats, source tracking, invalidation, and warming.
- `bootstrap.ts` still has a local `Bindings` type with `KV`, while the app-level binding is `CACHE_KV`. The bootstrap code itself does not use KV, but the stale type reinforces the binding naming drift.
- `app.ts` already has a small `registerBuiltInFeatureRoutes()` helper; this can be expanded into route registrar modules without changing public behavior.
- Slice A fixed the middleware barrel discrepancy by re-exporting the real plugin compatibility helpers from `plugin-middleware.ts`. The remaining cache architecture issue is now about the two cache service implementations and per-call simple cache instances, not a permanently false plugin gate from the barrel.
- Slice B moved app registration into `app-registration.ts` while preserving route/middleware order. `app.ts` is now mainly the public factory, app metadata setup, error handlers, and backward-compatibility setup functions.
- Phase 4 first pass made `src/services/cache.ts` a compatibility wrapper over the built-in feature cache service. Existing core routes can continue importing from `../services`, but storage now flows through the canonical cache implementation, `getCacheService()` reuses namespace instances, and key public/auth call sites now forward `CACHE_KV` into the canonical cache layer.
- Phase 3 first pass extracted bootstrap execution into `services/bootstrap.ts`. Middleware behavior remains fail-open for migration/sync errors and fail-closed for production security misconfiguration, but bootstrap now records per-step state, duration, and last error. The admin-only `/api/admin/system/bootstrap` endpoint exposes that status for diagnostics.
- Phase 5 first pass introduced `services/content-domain.ts` as the first shared content behavior owner. Admin delete still soft-deletes and headless delete still hard-deletes, but both now use one service for existence lookup and cache invalidation.
- Phase 6 first pass introduced `services/collection-domain.ts` for collection cache invalidation and wired both canonical `admin-api-collections.ts` and legacy `admin-api.ts` collection mutations through it. Duplicate collection route handlers still exist, but their cache invalidation behavior now has one owner.
- Phase 6 follow-up moved collection deletion into `collection-domain.ts`. Duplicate route handlers still expose different response shapes, but delete behavior now has one shared implementation with an explicit `blockManaged` compatibility option for the legacy admin route.
- Phase 7 first pass introduced `features/registry.ts` as a typed inventory of mounted built-in feature routes. It preserves current route order and marks `/api/plugins/*` paths as compatibility aliases without renaming or removing them yet.
- Phase 8 resolved the raw OAuth migration drift by adding canonical `010_oauth_accounts.sql`, bundling it into runtime migrations, and removing SQL files from `src/db/migrations`. `db:migrations:check` now verifies bundle filename/order parity and rejects non-canonical SQL files.
- Phase 9 first pass replaced the hot-path logging placeholder with `requestContextMiddleware`. Request ids are now consistently available through `c.get('requestId')` and returned as `X-Request-ID`, while request duration is exposed as `X-Response-Time` without overwriting route-level timing middleware.
