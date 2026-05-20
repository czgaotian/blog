# Legacy Surface Inventory

Last updated: 2026-05-20

This inventory supports Round 2 Phase 17. It classifies server feature folders and plugin-era surfaces by current runtime status before any deletion or quarantine move.

## Live Runtime Surfaces

| Surface | Classification | Evidence | Notes |
| --- | --- | --- | --- |
| `features/security-audit` | live | `preCacheBuiltInFeatureRegistry`, `securityAuditMiddleware()` | Also has `/api/plugins/security-audit` compatibility alias. |
| `features/ai-search` | live | `preCacheBuiltInFeatureRegistry` | Also has `/api/plugins/ai-search` compatibility alias. |
| `features/cache` | live | direct mount at `/api/admin/cache`; services used through `services/cache.ts` | Still uses plugin-era terms internally. |
| `features/auth/oauth-providers` | live | `postCacheBuiltInFeatureRegistry` | Mounted at `/api/auth/oauth`. |
| `features/user-profiles` | live | `postCacheBuiltInFeatureRegistry`; imported by `routes/auth.ts` | Auth routes depend on profile config helpers. |
| `features/auth/otp-login` | live | `postCacheBuiltInFeatureRegistry` | Mounted at `/api/auth/otp`. |
| `features/analytics` | live | `postCacheBuiltInFeatureRegistry`; `eventsApiRoutes` direct mount | Also has `/api/plugins/analytics` compatibility alias. |
| `features/workflow` | live | `postCacheBuiltInFeatureRegistry` | Also has `/api/plugins/workflow` compatibility alias. |
| `features/stripe` | live | `postEventsBuiltInFeatureRegistry` | Also has `/api/plugins/stripe` compatibility alias. |
| `features/email` | live | `lateBuiltInFeatureRegistry` | Mounted at `/api/admin/email`. |
| `features/auth/magic-link` | live | late `createMagicLinkAuthFeature()` registration | Mounted at `/api/auth/magic-link`. |
| `features/database-tools` | live | direct mount at `/api/admin/database-tools` | Admin-only route module. |
| `features/seed-data` | live | direct mount at `/api/admin/seed-data` | Admin-only route module. |
| `features/turnstile` | live service dependency | imported by `routes/public-forms.ts` | No direct app route mount found, but public forms depend on the service. |
| `features/global-variables` | live service dependency | imported by `routes/api-content-crud.ts` | Content rendering/variable resolution dependency. |

## Public Compatibility Surfaces

| Surface | Classification | Evidence | Recommended handling |
| --- | --- | --- | --- |
| `/api/plugins/security-audit` | public compatibility | registry marks `/api/plugins/*` as compatibility alias | Keep until a deprecation decision is documented. |
| `/api/plugins/ai-search` | public compatibility | registry compatibility alias | Keep until a deprecation decision is documented. |
| `/api/plugins/analytics` | public compatibility | registry compatibility alias | Keep until a deprecation decision is documented. |
| `/api/plugins/workflow` | public compatibility | registry compatibility alias | Keep until a deprecation decision is documented. |
| `/api/plugins/stripe` | public compatibility | registry compatibility alias | Keep until a deprecation decision is documented. |
| `middleware/plugin-middleware.ts` | internal compatibility | barrel exports helpers; tests assert built-in behavior | Keep as a compatibility adapter while callers still import plugin helpers. |
| legacy collection routes in `routes/admin-api.ts` | public compatibility | documented in `collection-route-inventory.md` | Keep as thin adapters over `collection-domain.ts` until client usage is confirmed. |
| headless `/api/content` mutation behavior | public compatibility | explicit `headless-*` modes in `content-domain.ts` | Keep behavior explicit; deprecate hard delete only with a separate product decision. |

## Internal Compatibility And Naming Debt

| Surface | Classification | Evidence | Recommended handling |
| --- | --- | --- | --- |
| cache event names `plugin.activate`, `plugin.deactivate`, `plugin.update` | internal compatibility | `features/cache/services/cache-invalidation.ts` and tests | Rename only after adding canonical event aliases. |
| cache namespace/config key `plugin` | internal compatibility | `features/cache/services/cache-config.ts` | Treat as naming debt, not dead code. |
| comments and README references to "plugin" in live features | internal compatibility | `rg "plugin"` across live feature folders | Clean gradually when touching those modules; avoid broad doc churn. |
| database-tools table allowlist entries `plugins`, `plugin_settings` | historical compatibility | `features/database-tools/services/database-service.ts` | Verify tables still exist before removing from tooling. |
| OAuth/magic-link/OTP comments mentioning email plugin settings | internal compatibility | auth feature source comments | Replace with built-in email/settings language when those settings are centralized. |

## Unmounted Or Quarantine Candidates

| Surface | Classification | Evidence | Recommended next step |
| --- | --- | --- | --- |
| `features/design` | quarantine candidate | route module exists; no import from app registration or registry found | Confirm no package consumers import it, then move under explicit quarantine or remove. |
| `features/editor-integrations` | quarantine candidate | helper/templates exist; no direct app mount found | Confirm whether admin build injects these helpers before moving. |
| `features/email-templates` | quarantine candidate | index says disabled by default and not registered; no app mount found | Decide whether this is superseded by `features/email`. |
| `features/redirect-management` | quarantine candidate | rich service/routes/templates exist; no app mount or registry import found | Needs a focused follow-up because it has many files and migration-like behavior. |
| `features/shortcodes` | service/quarantine candidate | feature folder exists; no app mount found | Confirm whether content rendering uses only resolver helpers or full admin surface. |

## Follow-Up Order

1. Add an automated fixture or test that compares `features/registry.ts` and `app-registration.ts` mounted features against this inventory.
2. For each quarantine candidate, run an import search and package export search before moving files.
3. Prefer moving inactive surfaces into an explicit quarantine namespace before deletion if public package imports are possible.
4. Clean plugin-era language only when the code path is already being edited for behavior; avoid broad rename commits that hide functional changes.
