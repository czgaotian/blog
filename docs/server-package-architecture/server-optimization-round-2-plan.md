# Server Package Optimization Round 2 Plan

Last updated: 2026-05-17

## Goal

Deepen the first-round server architecture cleanup by removing remaining duplicated ownership, turning compatibility layers into explicit contracts, and extending observability without adding hot-path database writes or broad rewrites.

Round 1 made the architecture safer and more legible. Round 2 should now consolidate the behaviors that were intentionally preserved for compatibility: legacy admin collection handlers, partial content-domain ownership, plugin-era feature names, cache key drift, and limited operational diagnostics.

## Current Baseline

- `app.ts` is mostly a public app factory; route and middleware registration now lives in `app-registration.ts`.
- `services/cache.ts` delegates to the built-in cache feature service.
- `services/bootstrap.ts` owns bootstrap state and exposes admin diagnostics.
- `services/content-domain.ts` centralizes delete behavior only.
- `services/collection-domain.ts` centralizes cache invalidation and delete behavior only.
- `features/registry.ts` inventories mounted built-in features and compatibility aliases.
- Canonical migrations live in `packages/server/migrations/*.sql`, checked against `src/db/migrations-bundle.ts`.
- Request context, request metrics, and sanitized env diagnostics exist.

## Round 2 Principles

1. Preserve public route behavior until a phase explicitly deprecates or aliases it.
2. Move behavior into domain services before deleting route code.
3. Treat admin UI/API clients as the compatibility boundary: search usages before removing endpoints.
4. Add tests at the domain-service level first, then route tests for compatibility surfaces.
5. Keep Worker hot paths cheap: metrics should stay low-cardinality and mostly in-memory unless a route explicitly opts into durable logging.

## Phase 10: Complete Content Domain Ownership

Priority: highest.

Actions:

- Expand `services/content-domain.ts` beyond delete behavior to own:
  - create content
  - update content
  - version creation
  - status transitions
  - cache invalidation
  - optional workflow/analytics hooks
- Route `/api/admin/content` create/update/delete through explicit modes:
  - `admin-create`
  - `admin-update`
  - `admin-soft-delete`
- Route `/api/content` mutations through explicit modes:
  - `headless-create`
  - `headless-update`
  - `headless-hard-delete` while it remains supported
- Add a compatibility note for hard delete: either keep it as a privileged destructive operation or mark it as deprecated with a planned replacement.
- Add tests proving:
  - admin create/update creates versions
  - admin delete soft-deletes
  - headless delete hard-deletes
  - all mutation modes invalidate the same cache namespace

Expected result:

- Content mutation behavior has one owner.
- Route files become schema/auth/response adapters rather than business-logic owners.

Suggested first slice:

- Move admin update version creation and cache invalidation into `updateContent()` without changing response shape.

## Phase 11: Complete Collection Domain Ownership

Priority: highest.

Actions:

- Expand `services/collection-domain.ts` to own:
  - create collection
  - update collection metadata/schema
  - field add/update/delete/reorder
  - managed collection protection
  - form-derived collection filtering policy
  - cache invalidation
- Keep `admin-api-collections.ts` as canonical route file.
- Convert remaining collection handlers in `admin-api.ts` into thin compatibility shims or remove them after confirming no admin/client usage.
- Add an endpoint inventory table documenting:
  - canonical route
  - legacy alias if any
  - response shape differences
  - removal/deprecation decision
- Add tests for code-managed, user-created, and form-derived shadow collections.

Expected result:

- Collection behavior has one service owner and one canonical route family.
- `admin-api.ts` shrinks toward dashboard/settings/logs/user/system concerns.

Suggested first slice:

- Inventory duplicated collection endpoints and add a route-level compatibility test before moving create/update behavior.

## Phase 12: Make Cache Keys And Invalidation Policy Explicit

Priority: high.

Actions:

- Create a cache key registry/helper, for example `services/cache-keys.ts`, covering:
  - public API content lists
  - content item reads
  - collection schema/list metadata
  - auth/user/session cache entries
  - feature cache prefixes
- Replace hand-built cache key strings in route/domain code with the helper.
- Define invalidation groups:
  - content mutation invalidates affected item and collection list keys
  - collection mutation invalidates collection metadata and content-list keys
  - media mutation invalidates media list/detail keys if cached
  - settings mutation invalidates settings/config keys if cached
- Add focused invalidation tests for content, collection, media, and settings.

Expected result:

- Cache keys are discoverable and reviewable.
- Cache invalidation behavior stops depending on scattered string conventions.

Suggested first slice:

- Introduce the helper and move existing content/collection invalidation keys behind it with no behavior change.

## Phase 13: Feature Registry Maturity And Compatibility Alias Policy

Priority: medium-high.

Actions:

- Extend `BuiltInFeatureDescriptor` with:
  - canonical route ids
  - compatibility alias metadata
  - owner module
  - required migrations
  - required bindings
  - admin UI exposure, if any
- Generate or expose an admin-only built-in feature status endpoint from the registry.
- Audit `/api/plugins/*` aliases and classify each:
  - required compatibility alias
  - internal-only route that can be renamed
  - dead/unmounted route
- Rename internal plugin-era identifiers where they do not affect public API.
- Document each public alias that must remain for clients.

Expected result:

- Built-in feature boundaries are visible from one typed registry.
- Plugin-era language remains only where it is an intentional backward-compatible public surface.

Suggested first slice:

- Add registry tests proving route order, alias metadata, and required binding metadata for mounted features.

## Phase 14: Bootstrap Policy And Operational Controls

Priority: medium.

Actions:

- Add `BOOTSTRAP_MODE` support:
  - `auto`: current default behavior
  - `manual`: expose status and manual run endpoint, do not run on every Worker cold start
  - `disabled`: test/local escape hatch only
- Make failure policy explicit by environment:
  - production migration failures fail closed
  - production security misconfiguration fails closed
  - development/test may warn and continue where safe
- Add admin-only manual bootstrap endpoint if `manual` mode is enabled.
- Add tests for each mode and failure policy.

Expected result:

- Bootstrap cost and failure behavior become deploy-time choices rather than implicit middleware behavior.

Suggested first slice:

- Add a parsed bootstrap config helper and tests, then wire it into middleware without changing the default `auto` behavior.

## Phase 15: Durable Request Logging As Opt-In Diagnostics

Priority: medium.

Actions:

- Keep hot-path request metrics in memory.
- Add opt-in durable request logging through the existing `Logger` service when enabled by config/env.
- Include sanitized request context:
  - request id
  - method
  - sanitized route/path
  - status code
  - duration
  - user id if authenticated
  - source module
- Use `executionCtx.waitUntil()` where available so logging does not block responses.
- Ensure durable logs never include raw request bodies, auth headers, cookies, or secret env values.
- Add tests for enabled/disabled logging and redaction.

Expected result:

- Operators can turn on durable API diagnostics without forcing D1 writes for every deployment.

Suggested first slice:

- Add a `requestLoggingMiddleware({ enabled })` that defaults off and reuses existing `Logger.logRequest()`.

## Phase 16: Route Ownership And Smoke Test Matrix

Priority: medium.

Actions:

- Add a route ownership document or generated fixture covering:
  - public API routes
  - admin API routes
  - auth routes
  - built-in feature routes
  - compatibility aliases
  - asset/fallback routes
- Add smoke tests around representative route families:
  - public content read
  - admin auth guard
  - admin collection route
  - admin feature route
  - compatibility alias route
  - admin SPA asset fallback
  - `/files/*` R2 route
- Keep smoke tests shallow: verify mounted path, guard behavior, and response shape, not full business logic.

Expected result:

- Future route registration edits have a broad safety net.
- Route ownership becomes visible to humans and agents.

Suggested first slice:

- Add route smoke tests for the post-round-1 app registration helpers.

## Phase 17: Dead Code And Legacy Surface Quarantine

Priority: medium-low.

Actions:

- Inventory unmounted feature folders, server-rendered admin templates, plugin-era helpers, and compatibility stubs.
- Classify each as:
  - live
  - public compatibility
  - internal compatibility
  - dead/quarantine
- Move dead or inactive plugin-era code under an explicit quarantine folder or remove it in small commits.
- Preserve exports that package consumers may import until a deprecation decision is documented.

Expected result:

- The server tree stops implying that unmounted features are live runtime behavior.
- Future agents can distinguish product surface from historical leftovers.

Suggested first slice:

- Produce `docs/server-package-architecture/legacy-surface-inventory.md` with live/compat/dead classification before deleting code.

## Recommended Execution Order

1. Phase 10: complete content domain ownership.
2. Phase 11: complete collection domain ownership.
3. Phase 12: cache key registry and invalidation policy.
4. Phase 16: route ownership smoke test matrix.
5. Phase 13: feature registry maturity and compatibility alias policy.
6. Phase 14: bootstrap mode and failure policy.
7. Phase 15: opt-in durable request logging.
8. Phase 17: dead code and legacy surface quarantine.

## Commit Strategy

- Commit after each vertical slice, not after a whole phase.
- Preferred commit shape:
  - one domain behavior move plus tests
  - one compatibility alias/shim change plus tests
  - one docs/inventory update when it unblocks later deletion
- Keep docs updated in `progress.md` and `findings.md` after every slice.

## Verification Baseline

Run after every code slice:

```bash
pnpm --filter @worker-blog/server test
pnpm type-check
```

Run after migration-related changes:

```bash
pnpm --filter @worker-blog/server db:migrations:check
```

## Round 2 Completion Criteria

- Content create/update/delete behavior is owned by `content-domain.ts`.
- Collection create/update/field/delete behavior is owned by `collection-domain.ts`.
- Cache keys and invalidation groups are centralized and tested.
- Built-in feature aliases are explicitly classified.
- Bootstrap mode/failure policy is configured and tested.
- Durable request logging is opt-in and redacted.
- Route ownership smoke tests cover the major mounted surfaces.
- Dead or inactive legacy surfaces are documented, quarantined, or removed.
