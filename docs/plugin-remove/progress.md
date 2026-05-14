# Progress

## 2026-05-13 Plugin Usage Inventory

- Started a read-only inventory of plugin usage across `packages/admin` and `packages/server`.
- Inspected server plugin runtime, generated manifest registry, bootstrap service, plugin DB service, admin API routes, plugin menu middleware, and app route mounting.
- Inspected admin SPA plugin routes, API hooks, plugins list/settings pages, layout plugin menu rendering, and legacy editor plugin adapters.
- Recorded key findings in `findings.md`; no business code changes made.

## 2026-05-14 Plugin Inventory Documentation

- Listed frontend plugin-related code in `packages/admin`: React SPA plugin list/settings APIs and pages, SPA navigation, legacy EasyMDE/TinyMCE/Quill editor adapters, and older server-rendered plugin templates.
- Extracted all 27 backend plugin manifests from `packages/server/src/plugins/**/manifest.json` and documented their category, core flag, and purpose.
- Confirmed plugin database tables from `packages/server/migrations/006_plugin_system.sql` and `packages/server/src/db/schema.ts`: `plugins`, `plugin_hooks`, `plugin_routes`, `plugin_assets`, and `plugin_activity_log`.
- Noted that no real `plugin_settings` table is defined; settings are stored in `plugins.settings`.
- Updated `docs/plugin-remove/findings.md`, `docs/plugin-remove/plugin-system-deprecation-plan.md`, and `docs/plugin-remove/task_plan.md`; no business code changes made.

## 2026-05-14 Deprecation Plan Decision Update

- Updated the plan to remove frontend generic plugin UI instead of renaming or keeping it as a transitional Features page.
- Documented that `/admin/plugins`, `/admin/plugins/:id/settings`, their SPA pages, API hooks, nav entries, and dynamic plugin menu rendering should be removed.
- Documented that frontend editor adapters for EasyMDE, TinyMCE, and Quill should remain for now with TODOs and be handled later with the content editor plan.
- Clarified backend strategy: preserve functionality, migrate plugin implementations into built-in feature modules, and use `plugins.settings` only as a temporary compatibility store.

## 2026-05-14 Backend Plugin Config Removal Decision

- Updated the deprecation plan to remove backend plugin configuration APIs as well: `/api/admin/plugins` and `/api/admin/plugin-settings/:id/settings`.
- Replaced the previous `FeatureSettingsService`/`plugins.settings` compatibility direction with a stricter decision: migrated functionality is built-in and does not need plugin settings.
- Documented that `plugins.status` and `plugins.settings` should not drive runtime behavior.
- Marked plugin DB tables and plugin management services as removable once runtime references are cleared.

## 2026-05-14 Plugin Removal Execution Started

- Removed the React SPA generic plugin management UI: `/admin/plugins`, `/admin/plugins/:id/settings`, related routes, nav entry, API clients, and `pluginMenu` rendering.
- Removed old server-rendered generic plugin management templates and plugin nav/dynamic menu injection from legacy admin layout templates.
- Removed backend generic plugin management/config APIs: `/api/admin/plugins` and `/api/admin/plugin-settings/:id/settings`, plus their shared admin-api contracts.
- Removed plugin menu middleware and plugin bootstrap/service exports from the server runtime.
- Converted migrated backend functionality away from plugin runtime switches/settings:
  - registration is always enabled by built-in auth validation rather than `core-auth` plugin settings.
  - security audit, global variables, shortcodes, AI search, redirect management, and compatibility plugin middleware no longer read `plugins.status`/`plugins.settings`.
  - Stripe, OAuth, Turnstile, email, and OTP login now use built-in defaults and/or environment variables instead of plugin settings.
- Kept frontend editor adapters for EasyMDE, TinyMCE, and Quill with TODO comments for the later editor-stack decision.
- Updated route metadata to remove the deleted generic admin plugin endpoints.
- Verification:
  - `pnpm type-check` passed.
  - Targeted server tests passed: `30` test files, `586` tests.
- Remaining intentional plugin-system residue:
  - shared plugin types, plugin SDK/builder/validator/manifest registry, and DB schema/migration/bundle entries still exist for a later platform-layer deletion phase.
