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
