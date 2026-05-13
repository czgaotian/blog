# Findings

## Cloudflare `vite-react-template`

- Source: https://github.com/cloudflare/templates/tree/main/vite-react-template
- Current template is a single Vite project combining React, Hono, and Cloudflare Workers.
- `package.json` uses scripts: `dev: vite`, `build: tsc -b && vite build`, `deploy: wrangler deploy`, `preview: npm run build && vite preview`, `cf-typegen: wrangler types`, `check: tsc && vite build && wrangler deploy --dry-run`.
- `vite.config.ts` registers `react()` and `cloudflare()` from `@cloudflare/vite-plugin`.
- `wrangler.json` points `main` to `./src/worker/index.ts`, enables `nodejs_compat`, observability, source maps, and serves SPA assets from `./dist/client` with `not_found_handling: "single-page-application"`.

## Local Repository

- `packages/admin` is currently the Vite React SPA package. It builds `dist/` with `base: "/admin/"`.
- `packages/server` is currently a Hono Worker package using `wrangler dev/deploy`; `wrangler.toml` binds static assets from `../admin/dist`.
- Existing server route `createAdminSpaRoutes()` uses the `ASSETS` binding to serve `/admin` and rewrite `/admin/assets/*` to `/assets/*`.
- Correct alignment for this monorepo is to make `packages/admin` the Vite project root and point Cloudflare Vite plugin at `packages/server/wrangler.toml` for the Worker.
- With Cloudflare Vite plugin active in `packages/admin`, production build emits `packages/admin/dist/client` for SPA assets and `packages/admin/dist/worker_blog_server` for the Worker preview/build output.
- `packages/server/wrangler.toml` must keep `assets.directory = "../admin/dist/client"` for `wrangler deploy --config ../server/wrangler.toml`.
