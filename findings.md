# Admin Tag Management Page Findings

## Existing Capabilities

- `packages/shared/src/admin-api/tags.ts` defines `TagListItem`, list/detail responses, create/update schemas, and mutate response types.
- Backend admin tag routes already exist in `packages/server/src/routes/admin-api-tags.ts`.
- Available backend endpoints:
  - `GET /api/admin/tags`
  - `GET /api/admin/tags/:id`
  - `POST /api/admin/tags`
  - `PUT /api/admin/tags/:id`
  - `DELETE /api/admin/tags/:id`
- Backend delete returns a conflict when a tag is used by content.
- `packages/admin/src/api/taxonomies.ts` currently has only list hooks: `useCategoriesList()` and `useTagsList()`.
- Admin routing is centralized in `packages/admin/src/router.tsx`.
- Sidebar navigation is configured in `packages/admin/src/layouts/base-layout.tsx`.
- Admin UI already uses local shadcn-style primitives under `packages/admin/src/components/ui`.

## Component Context

- `packages/admin` has `components.json`.
- shadcn project info:
  - Framework: Vite.
  - Tailwind: v4.
  - Base: radix.
  - Import alias: `@`.
  - Installed UI components include alert, badge, button, card, checkbox, dialog, field, input, label, pagination, select, separator, spinner, table, and textarea.
- No existing `colorpicker` component was found under `packages/admin/src/components/ui`.
- No existing popover component was found in admin UI components.

## Existing Admin Patterns To Reuse

- Content list page demonstrates:
  - `PageHeader` for title/actions.
  - `Table` for list views.
  - `LoadingState` and `Alert` for async states.
  - `ConfirmDialog` for destructive actions.
  - TanStack Query hooks in `packages/admin/src/api`.
- Content form demonstrates:
  - `react-hook-form`.
  - `Field`, `FieldGroup`, `FieldLabel`, and `FieldDescription`.
  - Shared taxonomy list usage.

## Implementation Constraints

- This is a new project, so no compatibility constraints beyond current codebase conventions.
- Do not modify migration files.
- Shared contracts should stay in `packages/shared` if tag form/API types need reuse.
- Admin-specific UI and hooks should stay in `packages/admin`.

## Verification Target

- Admin tests should pass.
- Admin type-check should pass.
- Admin build should pass.
- `git diff --check` should pass.

## Category Management Findings

- `packages/shared/src/admin-api/categories.ts` defines `CategoryListItem`, list/detail responses, create/update schemas, and mutate response types.
- Backend admin category routes already exist in `packages/server/src/routes/admin-api-categories.ts`.
- Available backend endpoints:
  - `GET /api/admin/categories`
  - `GET /api/admin/categories/:id`
  - `POST /api/admin/categories`
  - `PUT /api/admin/categories/:id`
  - `DELETE /api/admin/categories/:id`
- Category fields include `name`, `slug`, `description`, `parentId`, `sortOrder`, timestamps, and ids.
- Backend validates duplicate slugs, missing parents, self-parent assignment, parent cycles, and delete-in-use conflicts.
- `packages/admin/src/api/taxonomies.ts` currently has only category list support before this extension.
