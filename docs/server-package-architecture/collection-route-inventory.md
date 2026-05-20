# Collection Route Inventory

Last updated: 2026-05-20

## Purpose

Round 2 Phase 11 will finish moving collection behavior into `services/collection-domain.ts` and make `admin-api-collections.ts` the clear route owner. This inventory records the current canonical and legacy collection surfaces before more behavior is moved or compatibility routes are thinned.

## Route Families

| Route | Current owner | Status | Notes |
| --- | --- | --- | --- |
| `GET /api/admin/collections` | `admin-api-collections.ts` | Canonical | Returns `{ collections, total }` with camelCase fields and includes active/inactive user collections unless filtered by search. |
| `GET /api/admin/collections/:id` | `admin-api-collections.ts` | Canonical | Returns camelCase collection detail and maps JSON schema fields to `CollectionField`. |
| `POST /api/admin/collections` | `admin-api-collections.ts` | Canonical | Creates an empty object schema and returns `{ message, id }`. |
| `PATCH /api/admin/collections/:id` | `admin-api-collections.ts` | Canonical | Updates display name, description, active state and returns `{ message }`. |
| `DELETE /api/admin/collections/:id` | `admin-api-collections.ts` | Canonical | Uses `deleteCollection()` with managed-collection protection enabled. |
| `POST /api/admin/collections/:id/fields` | `admin-api-collections.ts` | Canonical only | Updates JSON schema-backed fields and returns `{ message, id }`. |
| `PUT /api/admin/collections/:id/fields/:fieldId` | `admin-api-collections.ts` | Canonical only | Handles both schema-backed fields and legacy `content_fields` rows. |
| `DELETE /api/admin/collections/:id/fields/:fieldId` | `admin-api-collections.ts` | Canonical only | Handles both schema-backed fields and legacy `content_fields` rows. |
| `POST /api/admin/collections/:id/fields/reorder` | `admin-api-collections.ts` | Canonical only | Reorders legacy `content_fields` rows. |
| `GET /api/admin/collections` | `admin-api.ts` | Legacy duplicate | Returns `{ data, count, timestamp }` with snake_case fields and supports `includeInactive=true`. |
| `GET /api/admin/collections/:id` | `admin-api.ts` | Legacy duplicate | Returns snake_case fields, raw parsed schema, and only legacy `content_fields` field rows. |
| `POST /api/admin/collections` | `admin-api.ts` | Legacy duplicate | Returns created collection object, accepts snake/camel display name, creates a starter schema with `title/content/status`. |
| `PATCH /api/admin/collections/:id` | `admin-api.ts` | Legacy duplicate | Accepts snake_case update keys and returns `{ message }`. |
| `DELETE /api/admin/collections/:id` | `admin-api.ts` | Legacy duplicate | Uses `deleteCollection({ blockManaged: false })`, so managed collections are not blocked at the route policy layer. |

## Compatibility Differences To Preserve Until Explicitly Deprecated

- Legacy list response uses `{ data, count, timestamp }`; canonical list response uses `{ collections, total }`.
- Legacy route field names are snake_case; canonical route field names are camelCase.
- Legacy list defaults to active collections only unless `includeInactive=true`; canonical list currently does not apply that active-only default.
- Legacy create builds a starter schema containing `title`, `content`, and `status`; canonical create builds an empty object schema.
- Legacy create responds with the created collection object; canonical create responds with `{ message, id }`.
- Legacy create returns `400` for duplicate names; canonical create returns `409`.
- Legacy update accepts snake_case keys (`display_name`, `is_active`); canonical update accepts shared admin API schema fields (`displayName`, `isActive`).
- Legacy delete calls `deleteCollection()` with `blockManaged: false`; canonical delete uses the default managed protection.
- Canonical field routes have no duplicate legacy equivalents in `admin-api.ts`.

## Recommended Phase 11 Slices

1. Move canonical collection create behavior into `collection-domain.ts` without changing canonical response shape.
2. Move canonical collection update behavior into `collection-domain.ts`.
3. Move field add/update/delete/reorder behavior into `collection-domain.ts` with schema-backed and legacy field-row branches preserved.
4. Convert legacy create/update/delete handlers into compatibility shims over the same domain service, preserving their response/error shapes.
5. Decide whether legacy list/get should remain as response-shape adapters or be deprecated in favor of canonical routes.

## Open Decisions

- Should legacy managed collection deletion remain permissive (`blockManaged: false`) indefinitely, or should it be deprecated?
- Should canonical list add `includeInactive` support before legacy list is thinned?
- Should canonical create keep empty schemas, or should starter schema creation become an explicit option/mode in `collection-domain.ts`?
