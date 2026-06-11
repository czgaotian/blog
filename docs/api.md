# API

## Base URLs

Local Worker/Admin dev server serves:

- Admin SPA: `/`
- API: `/api/*`
- Public files: `/files/*`

Bruno collection: `bruno/`.

## Authentication

### Register First Admin

`POST /api/auth/register`

- Allowed only when the `users` table is empty.
- Body contract: `registerSchema` from `@worker-blog/shared/admin-api`.
- Creates an admin user.

### Login

`POST /api/auth/login`

- Body: email and password.
- Returns user and JWT token.
- Sets `auth_token` HTTP-only cookie.
- Sets `csrf_token` readable cookie for browser mutation requests.

### Session

`GET /api/auth/session`

Alias:

`GET /api/auth/me`

### Refresh

`POST /api/auth/refresh`

Issues a fresh JWT for valid tokens or tokens expired within refresh grace window.

### Logout

`POST /api/auth/logout`

Also supports `GET /api/auth/logout` for browser convenience.

## Public API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/` | OpenAPI-style API info |
| GET | `/api/health` | API health and schema names |
| GET | `/api/contents` | Public content list with query filter support |
| GET | `/api/contents/check-slug` | Slug availability check |
| GET | `/api/contents/:id` | Published content detail; returns `bodyHtml` |
| GET | `/api/category/:slug` | Published contents by category |
| GET | `/api/tag/:slug` | Published contents by tag |
| POST | `/api/events` | Track analytics event or batch |
| GET | `/files/*` | Public R2 file streaming |

Public content list normalizes visibility by requester role. Anonymous, viewer, and author requests are restricted to published content; admin/editor can query broader statuses when authenticated.

## Admin API

Most `/api/admin/*` routes require authentication. Default guard is admin role, while specific modules may allow editor/author.

### Dashboard and System

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/admin/dashboard` | Dashboard data |
| GET | `/api/admin/stats` | Content/media/user counts |
| GET | `/api/admin/storage` | DB/media storage summary |
| GET | `/api/admin/activity` | Recent activity |

### Content

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/admin/contents` | List content with page/limit/status/category/tag/search |
| GET | `/api/admin/contents/:id` | Detail with `bodyJson` and `bodyHtml` |
| POST | `/api/admin/contents` | Create content |
| PUT | `/api/admin/contents/:id` | Update content |
| DELETE | `/api/admin/contents/:id` | Soft-delete content |
| GET | `/api/admin/contents/:id/versions` | Version history |
| POST | `/api/admin/contents/:id/restore/:version` | Restore version |

Write schemas:

- `createContentSchema`
- `updateContentSchema`

Both are from `@worker-blog/shared/admin-api`.

### Categories and Tags

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/admin/categories` | List categories |
| GET | `/api/admin/categories/:id` | Category detail |
| POST | `/api/admin/categories` | Create category |
| PUT | `/api/admin/categories/:id` | Update category |
| DELETE | `/api/admin/categories/:id` | Delete category if unused |
| GET | `/api/admin/tags` | List tags |
| GET | `/api/admin/tags/:id` | Tag detail |
| POST | `/api/admin/tags` | Create tag |
| PUT | `/api/admin/tags/:id` | Update tag |
| DELETE | `/api/admin/tags/:id` | Delete tag if unused |

### Media

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/media` | List media |
| GET | `/api/media/:id` | Media detail |
| POST | `/api/media/upload` | Upload one file |
| POST | `/api/media/upload-multiple` | Upload multiple files |
| PATCH | `/api/media/:id` | Update metadata |
| DELETE | `/api/media/:id` | Delete file |
| POST | `/api/media/bulk-delete` | Delete many files |

Media routes require auth. Mutating a file requires the uploader or admin.

### Profile and Settings

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/admin/profile` | Current profile |
| PUT | `/api/admin/profile` | Update profile |
| POST | `/api/admin/profile/password` | Change password |
| POST | `/api/admin/profile/avatar` | Upload avatar |
| GET | `/api/admin/settings` | Read settings |
| PUT | `/api/admin/settings/general` | Update general settings |
| PUT | `/api/admin/settings/security` | Update security settings |

### Logs, Security Audit, Analytics

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/admin/logs` | List system logs |
| GET | `/api/admin/logs/:id` | Log detail |
| GET | `/api/admin/logs/config` | Log config |
| GET | `/api/admin/security-audit` | Security audit dashboard |
| DELETE | `/api/admin/security-audit/lockouts/:key` | Release lockout |
| POST | `/api/admin/security-audit/events/purge` | Purge old security events |
| GET | `/api/admin/analytics` | Analytics dashboard |

## Browser CSRF vs Bearer Usage

Browser Admin UI:

- Uses same-origin cookies.
- Mutating requests include `X-CSRF-Token`.

Bruno/API scripts:

- Use `Authorization: Bearer {{authToken}}`.
- Do not need CSRF header.
