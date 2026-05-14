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
