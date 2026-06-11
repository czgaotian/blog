# Content Body JSON/HTML Findings

## Initial Inventory

- Current table is `contents`, not `posts`.
- Current content body column is `contents.body` in `packages/server/src/db/schema.ts`.
- Shared admin content contract is `packages/shared/src/admin-api/contents.ts` and currently uses `body: string`.
- Server write/version/restore logic is centralized in `packages/server/src/services/contents-domain.ts`.
- Admin content route maps detail responses in `packages/server/src/routes/admin-api-contents.ts`.
- Public content detail route currently returns `body` from `packages/server/src/routes/api-contents-crud.ts`.
- Existing tests cover admin routes and content domain behavior.
- Admin editor currently uses `StarterKit.configure({ horizontalRule: false, link: ... })`, custom `HorizontalRule`, `TextAlign`, `TaskList`, `TaskItem`, `Highlight`, `Image`, `Typography`, `Superscript`, `Subscript`, `Selection`, and `ImageUploadNode`.
- Server rendering should not import admin's React NodeView extension directly. It needs a server-side extension list with matching schema/render behavior for published content.

## Target Shape

- `bodyJson` is the only source of truth for editor recovery and version history.
- `bodyHtml` is a server-generated cache used for public rendering.
- Public API should not leak `bodyJson`.
- Server write schemas should not accept client-provided `bodyHtml`.
- Existing migration files must not be modified.
- Server HTML generation uses Tiptap `generateHTML` with the editor's publishing-relevant extensions, followed by `sanitizeRichText`.
- `imageUpload` is treated as a transient upload placeholder in server rendering and is represented by a server-local non-React node extension.

## Documentation Architecture Findings

- The repository is a pnpm workspace with `packages/server`, `packages/admin`, `packages/editor`, and `packages/shared`.
- Runtime entrypoint is `packages/server/src/index.ts`, which exports `createWorkerBlogApp()` from `packages/server/src/app.ts`.
- `packages/server/src/app-registration.ts` owns route/middleware registration order: metrics, setup guard, request context, optional durable request logging, security headers, CSRF, admin auth/role guard, API routes, feature routes, R2 file serving, health, and SPA fallback.
- Cloudflare bindings in `packages/server/wrangler.toml`: D1 `DB`, R2 `MEDIA_BUCKET`, KV `CACHE_KV`, Worker Assets `ASSETS`; assets come from `packages/admin/dist`.
- Admin UI uses React 19, Vite, React Router, TanStack Query, shadcn-style local UI components, and `adminFetch()` with same-origin credentials plus CSRF header for mutating browser requests.
- Editor package wraps Tiptap and exports `Editor`, `JSONContent`, upload types, and server rendering helpers.
- Shared package contains reusable admin API request/response contracts, zod schemas, query filtering utilities, sanitization, telemetry helpers, and route metadata.
- Important content design: `bodyJson` is editable/source-of-truth Tiptap JSON; `bodyHtml` is generated sanitized HTML cache for published content.
- Auth flow: first `POST /api/auth/register` only works while users table is empty; `POST /api/auth/login` returns JWT and sets `auth_token` plus `csrf_token`; admin routes require authenticated admin by default, while content routes further allow admin/editor/author.
- Public API includes OpenAPI-ish root, health, content list/detail, category/tag content lists, event tracking, and public file serving under `/files/*`.
- Bruno collection under `bruno/` documents runnable local API requests and uses `authToken` for bearer requests.
