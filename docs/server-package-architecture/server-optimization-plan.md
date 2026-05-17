# Server Package Optimization Plan

Last updated: 2026-05-17

## Goal

Optimize the current `packages/server` architecture without rewriting the product. The main objective is to reduce behavioral ambiguity, make cold-start/runtime costs predictable, and create clearer ownership boundaries between core CMS APIs, built-in feature slices, and legacy plugin-era compatibility code.

## Current Architecture Summary

`packages/server` is a Cloudflare Worker backend built with Hono, D1, R2, KV, and Drizzle. The server package currently owns:

- Worker app creation in `src/app.ts`.
- Runtime bootstrap, D1 migrations, collection sync, and form collection sync.
- Auth, CSRF, security headers, metrics, admin guards, and public/admin APIs.
- Dynamic collections/content, media, forms, analytics/events, cache, email, search, workflow, Stripe, user profiles, and security audit features.
- Admin SPA asset serving through the server `wrangler.toml`.

The architecture already works as a modular monorepo package, but the server package has accumulated several transition layers from older plugin and server-rendered eras. The optimization plan should treat this as a consolidation effort, not a framework migration.

## Main Problems To Fix

| Area | Current Issue | Impact |
| --- | --- | --- |
| App composition | `src/app.ts` directly wires nearly every middleware, route family, built-in feature, asset route, and compatibility hook. | Hard to reason about route ownership and safe insertion order. |
| Bootstrap | Migrations, collection sync, form sync, and security verification run from a global middleware before normal requests once per Worker instance. | Cold requests can pay setup cost; failures are partly swallowed; bootstrap state is in-memory only. |
| Cache | Core cache service and feature cache service are separate implementations; public API cache gating still imports an `isPluginActive` stub from `middleware/index.ts` that returns `false`, while `plugin-middleware.ts` returns `true`. | Cache behavior is inconsistent and easy to misunderstand. |
| Bindings | Main app exposes `CACHE_KV`, while some local types and earlier findings reference `KV`. | Risk of silent cache/security degradation and test drift. |
| Content APIs | `/api/content` and `/api/admin/content` have different delete/version semantics. | Clients can accidentally bypass admin versioning/soft-delete behavior. |
| Admin collection routes | Legacy collection endpoints remain in `admin-api.ts` while newer routes live in `admin-api-collections.ts`. | Duplicate behavior and unclear source of truth. |
| Feature naming | Many built-in features still use plugin-era routes/names/migrations after plugin platform table removal. | Makes the system look more dynamic than it is and hides true runtime ownership. |
| Migration sources | Top-level migrations and bundled runtime migrations can drift; OAuth migration `0010` needs explicit intent. | Fresh local, Worker runtime, and wrangler migration paths may diverge. |

## Optimization Principles

1. Preserve public API behavior unless a phase explicitly deprecates it.
2. Prefer small boundary extractions over broad rewrites.
3. Make runtime ownership explicit: core, admin API, public API, built-in feature, compatibility.
4. Keep Cloudflare Worker constraints central: cold start, D1 latency, KV eventual consistency, asset binding, and no filesystem at runtime.
5. Add tests around behavior before changing route semantics.

## Phase 1: Stabilize Runtime Contracts

Priority: highest.

Actions:

- Standardize Worker binding names around `CACHE_KV`.
- Replace compatibility exports in `middleware/index.ts` so they delegate to real implementations from `plugin-middleware.ts`, or remove imports that depend on plugin-era checks.
- Add focused tests proving public API cache gating, auth/security audit KV usage, and admin collection cache invalidation all use the same binding contract.
- Audit `Bindings` aliases in middleware/routes so local type definitions do not mention stale `KV` unless a real binding exists.
- Document the intended binding contract in `packages/server/README.md` and `server-package-context.md`.

Expected result:

- No route silently disables cache/security behavior because it imported the wrong compatibility symbol.
- Tests describe the canonical `CACHE_KV` contract.

Suggested verification:

```bash
pnpm --filter @worker-blog/server test
pnpm type-check
```

## Phase 2: Split App Composition Into Route Registrars

Priority: high.

Actions:

- Keep `createWorkerBlogApp()` as the public factory, but move registration into small functions:
  - `registerCoreMiddleware(app, config)`
  - `registerCoreApiRoutes(app)`
  - `registerAdminApiRoutes(app)`
  - `registerBuiltInFeatures(app)`
  - `registerAssetsAndFallbacks(app)`
- Preserve middleware order exactly during extraction.
- Move built-in feature route registration metadata into one `features/registry.ts` file.
- Make the feature route convention explicit: direct `/api/*`, auth features under `/api/auth/*`, and no implicit plugin activation gates.
- Add route smoke tests around representative public, admin, auth, feature, admin SPA, and file routes.

Expected result:

- `app.ts` becomes a readable orchestration entrypoint instead of a route inventory.
- Future route changes can be reviewed by ownership area.

## Phase 3: Make Bootstrap Explicit And Observable

Priority: high.

Actions:

- Extract bootstrap work into a `BootstrapService` with named steps:
  - run bundled migrations
  - sync code collections
  - sync form collections
  - verify security config
- Track per-step result, duration, and failure mode.
- Decide whether migration/sync failures should be fail-open or fail-closed by environment:
  - production should fail closed for migration and security-critical failures
  - development/test can warn and continue when appropriate
- Exempt admin static assets and health endpoints consistently, including `/admin/assets/*` and `/api/health`.
- Add a lightweight `/api/system/bootstrap` admin diagnostic endpoint showing last bootstrap status for the current Worker instance.
- Consider a `BOOTSTRAP_MODE` config later: `auto`, `manual`, `disabled-for-tests`.

Expected result:

- Cold-start behavior is measurable.
- Bootstrap failure policy is intentional instead of scattered through catch blocks.

## Phase 4: Consolidate Cache Architecture

Priority: high.

Actions:

- Pick one cache implementation as canonical. The feature cache service is the better candidate because it already models memory plus KV, stats, invalidation, warming, and source tracking.
- Adapt core routes to use the canonical cache service instead of `src/services/cache.ts`.
- If the simple cache service must remain for compatibility, make it a thin wrapper over the feature cache service.
- Pass `c.env.CACHE_KV` explicitly when routes need cross-instance cache.
- Normalize cache key naming. Current code mixes `api:content:*`, `cache:collections:*`, and feature-specific keys.
- Add invalidation tests for content create/update/delete, collection schema mutation, media mutation, and settings changes.

Expected result:

- Cache reads and invalidations operate on the same storage model.
- Admin cache UI reflects cache behavior that public APIs actually use.

## Phase 5: Clarify Content API Semantics

Priority: medium-high.

Actions:

- Define a single content domain service that owns create/update/delete/version behavior.
- Make `/api/admin/content` and `/api/content` call that service with an explicit mode:
  - `admin` mode: versioning, soft delete, admin schemas, workflow hooks.
  - `headless` mode: preserve current public/headless contract unless deprecated.
- Decide whether hard delete in `/api/content/:id` remains supported. If yes, rename/document it as a privileged destructive operation; if no, deprecate and route it through soft delete.
- Add tests that lock down delete/version behavior for both surfaces.
- Emit consistent cache invalidation and analytics/workflow events from the domain service.

Expected result:

- Content behavior becomes discoverable and testable.
- Future features do not need to duplicate admin/headless route logic.

## Phase 6: Remove Duplicate Admin Collection Ownership

Priority: medium.

Actions:

- Treat `admin-api-collections.ts` as the source of truth.
- Inventory collection endpoints still present in `admin-api.ts`.
- Redirect or remove duplicate handlers once admin UI and tests use the newer route family.
- Move collection schema mutation, field updates, cache invalidation, and form-derived collection filtering into a collection domain service.
- Add regression tests for code-managed collections, user-created collections, and form-derived shadow collections.

Expected result:

- Collection behavior has one owner.
- Legacy admin API file shrinks toward dashboard/settings/logs/user/system concerns.

## Phase 7: Normalize Built-In Feature Boundaries

Priority: medium.

Actions:

- Create a feature registry type with stable fields:
  - `id`
  - `displayName`
  - `routes`
  - `adminRoutes`
  - `requiredBindings`
  - `migrations`
  - `status`
- Rename internal plugin-era terms where the feature is now built in.
- Keep backward-compatible `/api/plugins/*` aliases only when clients may depend on them, and mark them as compatibility routes.
- Remove or quarantine feature folders that contain unmounted admin HTML/templates if they are no longer live.
- Align feature migrations with the main migration bundle policy.

Expected result:

- Built-in features are visible as first-class server modules.
- Plugin-era compatibility remains deliberate instead of accidental.

## Phase 8: Fix Migration Source Of Truth

Priority: medium.

Actions:

- Define the canonical migration source: top-level `packages/server/migrations/*.sql`.
- Add a script/check that regenerates and verifies `src/db/migrations-bundle.ts` from that source.
- Resolve the `0010_oauth_accounts.sql` mismatch by either moving it into the canonical top-level migration list or documenting why it is intentionally excluded.
- Add CI/typecheck coverage that fails when migration files and bundle IDs drift.
- Review migration behavior around duplicate-column tolerant runtime migrations versus wrangler D1 migrations.

Expected result:

- Fresh Worker runtime, local wrangler D1, and tests share the same migration story.

## Phase 9: Improve Observability And Operational Surfaces

Priority: medium-low.

Status: first pass implemented for request context middleware, low-cardinality request metrics, and sanitized environment diagnostics.

Actions:

- Replace logging placeholder middleware with a real request logging implementation or remove it from the hot path.
- Standardize request IDs across metrics, logs, security audit, and analytics.
- Add low-cardinality timing metrics for bootstrap, D1 query groups, R2 media operations, and cache source.
- Ensure admin diagnostics do not expose secrets or sensitive environment details.

Expected result:

- Runtime performance issues can be diagnosed from server-owned signals.

## Recommended Execution Order

1. Phase 1: binding and compatibility contract cleanup.
2. Phase 4: cache consolidation, because it depends on the binding contract and removes misleading behavior.
3. Phase 2: app composition extraction, after route behavior is less ambiguous.
4. Phase 3: bootstrap service and diagnostics.
5. Phase 5 and Phase 6: content/collection domain consolidation.
6. Phase 7: built-in feature registry and plugin-era cleanup.
7. Phase 8: migration drift check.
8. Phase 9: observability polish.

## First Two Implementation Slices

### Slice A: Runtime Contract Fix

Scope:

- Fix `middleware/index.ts` compatibility exports.
- Normalize `CACHE_KV` binding types.
- Add tests for `isPluginActive`, public API cache path, and auth/security KV assumptions.

Acceptance criteria:

- `isPluginActive` has one behavior across imports.
- Public API cache checks are no longer permanently disabled by a stale stub.
- Type check passes without stale `KV` binding assumptions.

### Slice B: App Registration Extraction

Scope:

- Extract route/middleware registration helpers without changing behavior.
- Add route smoke tests.
- Keep `createWorkerBlogApp()` public API stable.

Acceptance criteria:

- `src/app.ts` is shorter and reads as orchestration.
- Existing routes remain mounted at the same paths.
- Route smoke tests cover core, admin, feature, assets, files, auth, and health.

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Cache fixes change performance or stale-data behavior. | Add route-level cache/invalidation tests before replacing services. |
| App extraction accidentally changes middleware order. | Snapshot current order in tests or use route smoke tests with auth/CSRF/admin guard assertions. |
| Bootstrap fail-closed breaks dev workflows. | Gate strict failure behavior by `ENVIRONMENT === "production"` and test both paths. |
| Removing legacy routes breaks admin/client code. | Search admin API client usages before deleting; keep aliases during one release. |
| Migration bundle changes break existing databases. | Verify fresh local D1, migrated local D1, and runtime migration service paths. |

## Success Criteria

- Server route ownership is obvious from files, not only from `app.ts`.
- Cache behavior is shared by public API, admin cache UI, and invalidation paths.
- Bootstrap behavior is measurable and has environment-specific failure policy.
- Content and collection mutations have one domain owner each.
- Built-in features no longer look like partially active plugins unless the route is intentionally backward-compatible.
- Migration bundle drift is detectable before deployment.
