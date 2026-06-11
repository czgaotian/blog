# Data Model

## Database

Database schema is declared in `packages/server/src/db/schema.ts` with Drizzle SQLite tables. Runtime database is Cloudflare D1 binding `DB`.

Existing migration files live in `packages/server/migrations/`. Do not edit existing migration files. Add new migrations for new schema changes.

## Core Tables

| Table | Purpose |
| --- | --- |
| `users` | Auth users, role, profile basics, password hash, login metadata |
| `user_profiles` | Extended/custom profile data |
| `categories` | Hierarchical content categories |
| `tags` | Content tags with color |
| `contents` | Blog/CMS content items |
| `content_tags` | Many-to-many content/tag join |
| `content_versions` | Version snapshots for admin content history |
| `content_media_references` | References from content body/cover to media |
| `media` | Uploaded file metadata and R2 keys |
| `settings` | JSON-encoded general/security settings |
| `activity_logs` | User/resource activity |
| `password_history` | Historical password hashes |
| `system_logs` | Structured request/system logs |
| `log_config` | Per-category logging config |

Feature migrations may also define analytics/security-audit tables. Check migrations before changing those features.

## User Roles

The `users.role` column stores role strings such as:

- `admin`
- `editor`
- `author`
- `viewer`

Route-level gates decide which roles can access each operation.

## Content Model

Important columns in `contents`:

| Column | Meaning |
| --- | --- |
| `id` | Primary key |
| `slug` | Public slug; active rows have unique slug where `deleted_at IS NULL` |
| `title` | Required title |
| `excerpt` | Optional summary |
| `body_json` | Tiptap JSON source of truth |
| `body_html` | Generated sanitized HTML cache |
| `status` | Draft/published/archive-style workflow state |
| `category_id` | Optional category |
| `cover_image_id` | Optional media cover |
| `published_at` | Publish timestamp |
| `metadata` | JSON metadata object |
| `author_id` | User author |
| `deleted_at` | Soft-delete marker |

## Body JSON / HTML Contract

`bodyJson`:

- Admin write field.
- Admin detail read field.
- Stored as `contents.body_json`.
- Stored in `content_versions.data`.
- Should be treated as the canonical editable body.

`bodyHtml`:

- Server-generated field.
- Stored as `contents.body_html`.
- Generated when content is published or published content body changes.
- Public detail endpoint returns it.
- Client writes should not send it.

Rendering function:

- `packages/editor/src/lib/server.ts` renders Tiptap JSON to HTML.
- `packages/server/src/services/content-renderer.ts` re-exports it.
- HTML is sanitized with `sanitizeRichText`.

## Media References

`content_media_references` links content to media:

- `usage_type = "body"` for images/files referenced in Tiptap body.
- `usage_type = "cover"` for cover image references.

The content domain service updates references when content is created, updated, or restored.

## Timestamps

The codebase uses a mix of millisecond integers and Drizzle timestamp modes. API responses usually convert Admin-facing timestamps to ISO strings. Be careful when writing SQL manually:

- Many auth/content/media routes use `Date.now()` milliseconds.
- Some Drizzle defaults use timestamp mode.
- Some analytics code uses Unix seconds for day-window queries.

Follow the surrounding table/route convention before changing timestamp behavior.
