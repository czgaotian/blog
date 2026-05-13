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

6. [in_progress] Inspect package structure and plugin-related files.
7. [pending] Map server plugin registration, routing, lifecycle, and available/core plugin layout.
8. [pending] Map admin SPA/plugin UI usage and API integration.
9. [pending] Produce concise Chinese summary for the user.
