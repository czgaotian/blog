# Frontend

## Admin Stack

- React 19.
- Vite 8.
- React Router 7.
- TanStack Query 5.
- React Hook Form + zod resolvers.
- shadcn-style local components configured by `packages/admin/components.json`.
- lucide-react icons.
- Sonner toasts.
- Shared Tiptap editor from `@worker-blog/editor`.

## Admin Entry

| File | Responsibility |
| --- | --- |
| `packages/admin/src/main.tsx` | React root, QueryClientProvider |
| `packages/admin/src/app.tsx` | ErrorBoundary, RouterProvider, Toaster |
| `packages/admin/src/router.tsx` | Browser route tree |
| `packages/admin/src/layouts/base-layout.tsx` | Main authenticated shell |
| `packages/admin/src/layouts/auth-layout.tsx` | Login/register shell |
| `packages/admin/src/api/client.ts` | Fetch wrapper, CSRF, auth redirects, setup redirect |

## Admin Routes

| Browser Path | Page |
| --- | --- |
| `/auth/login` | Login |
| `/auth/register` | First-admin registration |
| `/dashboard` | Dashboard |
| `/contents` | Content list |
| `/contents/new` | Create content |
| `/contents/:id` | Edit content |
| `/categories` | Category management |
| `/tags` | Tag management |
| `/media` | Media library |
| `/analytics` | Analytics dashboard |
| `/logs` | Logs list |
| `/logs/config` | Log config |
| `/logs/:id` | Log details |
| `/security-audit` | Security audit |
| `/settings` | Settings |
| `/profile` | Profile/password/avatar |
| `/spa-test` | SPA fallback test page |

## Admin Navigation

Navigation is defined in `packages/admin/src/layouts/base-layout/navigation.ts`.

Sections:

- Operate: Dashboard, Contents, Media, Categories, Tags.
- Observe: Analytics, Logs, Security Audit.
- System: Settings, Profile, SPA Test.

## API Client Behavior

`adminFetch<T>()`:

- Sends `credentials: "same-origin"`.
- Adds `Content-Type: application/json` for non-FormData bodies.
- Reads `csrf_token` cookie.
- Adds `X-CSRF-Token` for mutating methods.
- Redirects to `/auth/register?setup=true` when API returns 428 `SETUP_REQUIRED`.
- Redirects to `/auth/login` on 401 outside auth pages and credential requests.
- Throws `AdminApiError` with status and response payload.

## Editor Package

`packages/editor` exports:

- `Editor` React component.
- `JSONContent` type from Tiptap.
- Image upload types.
- Tiptap utilities.
- `renderTiptapJsonToHtml()` for server/public rendering.

Editor extensions are created in `packages/editor/src/lib/extensions.ts`.

Editable editor extensions include StarterKit, custom horizontal rule, text align, task list/item, highlight, image node, typography, superscript, subscript, selection, node background, image upload node, paste image upload, and lowlight code blocks.

Content render extensions exclude editor-only interaction helpers and are used for HTML generation.

## Content Form Flow

1. Content pages use Admin API hooks from `packages/admin/src/api/contents.ts`.
2. Content form state is normalized by `packages/admin/src/lib/content-form.ts`.
3. Rich text value is Tiptap `JSONContent`.
4. Create/update requests send `bodyJson`.
5. Server returns `bodyJson` for editing and `bodyHtml` for preview/cache visibility.

## UI Conventions

- Local UI primitives live in `packages/admin/src/components/ui/`.
- shadcn config uses `new-york`, neutral base color, CSS variables, and aliases `@/components`, `@/components/ui`, `@/lib`.
- Page-level content lives under `packages/admin/src/pages/`.
- Shared page chrome lives under `packages/admin/src/layouts/` and `packages/admin/src/components/`.
- Do not put server/cloudflare logic in Admin.
