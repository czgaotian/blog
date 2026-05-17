# Task Plan: Cloudflare Vite React Template Alignment

## Goal
Modify the `admin` and `server` packages to follow the current Cloudflare `vite-react-template` architecture where the React/Vite app and Hono Worker are built/developed through the Cloudflare Vite plugin with SPA asset handling.

## Phases

1. [complete] Inspect current package structure and Cloudflare template architecture.
2. [complete] Decide the smallest compatible structural change for this monorepo.
3. [complete] Update `admin` and `server` package config/code.
4. [complete] Run type/build/test verification.
5. [complete] Document the resulting workflow and residual risks.

## Decisions

- Preserve existing app behavior and route surface unless the Cloudflare architecture requires a path/config change.
- Keep changes scoped to `packages/admin` and `packages/server` unless workspace-level dependency metadata is required.
- User clarified package mapping: `packages/admin` is the template React/Vite app; `packages/server` is the template Worker.

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| `bwrap: loopback: Failed RTM_NEWADDR` | Initial local read command in sandbox | Re-ran with approved escalation for local repository reads. |
| `Could not resolve "../../../middleware/api/auth"` | First Cloudflare Vite Worker build | Updated stale plugin imports to existing middleware modules. |
| Vitest startup error from Cloudflare plugin environment validation | Admin unit test after adding Cloudflare plugin | Disabled the Cloudflare plugin when Vite mode is `test`. |
| `Cannot find module '../services/api/auth-validation'` | Workspace type-check | Updated stale import to `../services/auth-validation`. |

## Follow-up: Plugin Usage Inventory

Goal: Summarize how plugins are used across the project, especially `packages/admin` and `packages/server`.

6. [complete] Inspect package structure and plugin-related files.
7. [complete] Map server plugin registration, routing, lifecycle, and available/core plugin layout.
8. [complete] Map admin SPA/plugin UI usage and API integration.
9. [complete] Produce concise Chinese summary for the user.
10. [complete] Document frontend plugin inventory, backend plugin manifest inventory, and plugin database tables.
11. [complete] Update deprecation plan with decision to remove frontend generic plugin UI, keep editor adapters as TODO, and migrate backend plugins into built-in feature modules.
12. [complete] Update plan with decision to remove backend plugin configuration APIs and treat all migrated functionality as built-in with no plugin settings layer.

## Follow-up: Plugin Removal Execution

Goal: Start removing the generic plugin management surface while preserving existing feature behavior as built-in modules.

13. [complete] Remove React SPA `/admin/plugins` and `/admin/plugins/:id/settings` pages, routes, API clients, nav entry, and dynamic plugin menu rendering.
14. [complete] Keep editor adapters in place with TODO comments for later editor-stack cleanup.
15. [complete] Remove backend generic plugin management/config routes and shared admin-api contracts.
16. [complete] Remove server plugin menu middleware and plugin bootstrap/service runtime wiring.
17. [complete] Convert runtime feature checks/settings away from `plugins.status` and `plugins.settings` for the touched built-in modules.
18. [complete] Remove old server-rendered generic plugin list/settings templates and legacy plugin nav/menu injection.
19. [complete] Update route metadata and tests for the new built-in/no-config behavior.
20. [complete] Run type-check and targeted server tests.
21. [complete] Delete remaining platform-layer code once feature routes are explicitly migrated: plugin SDK/builder/validator/manifest registry, shared plugin types, schema/migrations for plugin tables.

## Follow-up: Platform Layer Cleanup

Goal: Remove unused plugin platform abstractions after the generic management runtime was removed.

22. [complete] Map remaining platform-layer imports and decide which files can be deleted without moving feature code yet.
23. [complete] Delete unused SDK/registry/validator/type exports and fix imports.
24. [complete] Remove or quarantine plugin DB schema/migration references only when runtime and tests show no dependency.
25. [complete] Update docs with the reduced residual surface.
26. [complete] Run type-check and relevant tests.

## Follow-up: Built-in Feature Directory Rename

Goal: Move remaining built-in feature implementations out of `packages/server/src/plugins/*` paths after the platform layer has been removed.

27. [pending] Rename runtime feature directories from `plugins/*` to `features/*` in small slices.
28. [pending] Update stale docs/comments that still describe built-in features as plugins.
29. [pending] Decide whether old manifest JSON files should be deleted or converted into feature metadata.
