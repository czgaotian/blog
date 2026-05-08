# Findings

## Migration Plan Summary

Phase 1 target:

- Add Vite + React SPA skeleton in `packages/admin`.
- Add Tailwind/PostCSS/shadcn-compatible styling foundation.
- Add basic router/layout/not found and `/admin/spa-test`.
- Add API client with same-origin credentials and CSRF header for mutating requests.
- Add `/admin/api/me`.
- Add server SPA shell/assets routing while keeping old routes working.
- Update `wrangler.toml` with `[assets]` and `MEDIA_BUCKET`.

## Constraints

- Do not import browser React entry from Worker runtime code.
- Route order must keep `/admin/api/*` and legacy admin HTML routes ahead of SPA fallback.
- Keep old `@worker-blog/admin/templates` exports during migration.

## Phase 2 Notes

- `/admin/api/me` is the SPA bootstrap boundary for current user, permissions, app metadata, and plugin menu data.
- The server already computes plugin menu items in `pluginMenuMiddleware`; React layout should consume them as legacy links until plugin SPA routes are designed.
- `packages/admin` does not currently have its own frontend test harness. For the first Phase 2 increment, verification uses server route tests, `pnpm type-check`, and admin Vite build.
- Business admin URLs remain legacy links in the sidebar until their API/page migrations are done one feature at a time.
