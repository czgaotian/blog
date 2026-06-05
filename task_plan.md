# Admin Taxonomy Management Implementation Plan

## Goal

Add an admin tag management page to the frontend. The page should support listing, creating, editing, and deleting tags through the existing admin tag API, and tag color editing must use a `colorpicker` UI component.

Extend the same management pattern to admin categories, including listing, creating, editing, deleting, optional parent category selection, and sort order editing.

## Scope

- Frontend package: `packages/admin`.
- Shared API contracts already exist in `packages/shared/src/admin-api/tags.ts`.
- Backend tag CRUD routes already exist at `/api/admin/tags`.
- Do not modify migration files.
- Keep admin UI copy in English.

## Phases

1. Confirm contracts, routes, and component availability. Status: complete.
2. Add or wire the `colorpicker` UI component. Status: complete.
3. Add admin tag API hooks and form helpers. Status: complete.
4. Build the tag management page. Status: complete.
5. Register route and navigation entry. Status: complete.
6. Add focused tests and run verification. Status: complete.

## Implementation Notes

### Phase 2: `colorpicker`

- Check whether a suitable shadcn-compatible `colorpicker` registry component exists before writing one locally.
- If no registry component exists, create `packages/admin/src/components/ui/colorpicker.tsx` as a reusable UI primitive.
- Prefer a controlled API such as `value`, `onChange`, `disabled`, and `aria-invalid`.
- Support hex values because `createTagSchema.color` currently accepts a short string and existing tag rows expose `color: string`.
- Compose it with existing `Field`, `Input`, `Button`, and/or overlay primitives as appropriate.

### Phase 3: API Hooks And Form Helpers

- Extend `packages/admin/src/api/taxonomies.ts` with:
  - `useTagDetail(id)`
  - `useCreateTag()`
  - `useUpdateTag(id)`
  - `useDeleteTag(id)`
- Import request/response types from `@worker-blog/shared/admin-api`.
- Invalidate `['admin', 'tags']` after successful create/update/delete.
- Add a small form model in `packages/admin/src/lib/tag-form.ts` using Zod or the shared schemas.
- Default tag color to a valid hex color such as `#64748b`.
- Keep slug optional so the backend can derive it from the name.

### Phase 4: Page UX

- Create `packages/admin/src/pages/tags-list.tsx`.
- Use existing admin page patterns:
  - `PageHeader`
  - `Table`
  - `Button`
  - `Badge`
  - `Alert`
  - `LoadingState`
  - existing `ConfirmDialog`
- Show columns for color swatch, name, slug, description, updated date, and actions.
- Create/edit can be a dialog on the list page to keep this taxonomy workflow compact.
- Delete should use confirmation and surface the backend conflict error when a tag is in use.
- Empty state should be simple and task-focused.

### Phase 5: Routing And Navigation

- Add `/tags` to `packages/admin/src/router.tsx`.
- Add a sidebar item in `packages/admin/src/layouts/base-layout.tsx`.
- Use a taxonomy-appropriate icon from the existing `lucide-react` dependency.

### Phase 6: Verification

- Add focused tests for form defaults/conversion and API invalidation behavior if practical.
- Run:
  - `pnpm --filter @worker-blog/admin test`
  - `pnpm --filter @worker-blog/admin type-check`
  - `pnpm --filter @worker-blog/admin build`
  - `git diff --check`

## Decisions

- Reuse existing backend tag CRUD routes; no server route work is planned.
- Reuse shared tag contracts; no duplicated request/response types in admin.
- Use a dedicated `colorpicker` component for the `color` field.
- Prefer a list-page dialog workflow over separate create/edit routes unless implementation reveals a strong reason to split pages.

## Risks And Questions

- The shadcn registry did not expose an obvious `color` component via the attempted command, so a local `colorpicker` may be needed.
- The current shared schema validates color as `z.string().min(1).max(32)` rather than strict hex. The UI should guide toward hex without changing backend validation unless requested.
- Deleting tags already linked to content returns a 409 `Tag is in use`; the UI must show that clearly instead of treating it as a generic failure.

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| `shadcn search colorpicker color-picker color --limit 20` treated `colorpicker` as a registry namespace and failed. | Checked registry availability. | Use explicit registry item names or inspect docs/registry differently during implementation. |
| `shadcn search @shadcn/color ...` reported `@shadcn/color` was not found. | Checked for an official color component. | Plan allows a local `colorpicker` component if no registry component is available. |

## Verification

- `pnpm --filter @worker-blog/admin test` passed: 5 files, 16 tests.
- `pnpm --filter @worker-blog/admin type-check` passed.
- `pnpm --filter @worker-blog/admin build` passed with the existing large client chunk warning.
- `git diff --check` passed.

## Category Management Extension

### Goal

Add a frontend category management page using the existing admin category API and the same compact list/dialog/delete-confirmation workflow as tags.

### Phases

1. Inspect category contracts and existing tag implementation. Status: complete.
2. Add category API hooks and form helpers. Status: complete.
3. Build category management page. Status: complete.
4. Register route and navigation entry. Status: complete.
5. Add tests and run verification. Status: complete.

### Notes

- Reuse `packages/shared/src/admin-api/categories.ts` request/response types.
- Backend already supports category list/detail/create/update/delete.
- Category form fields: name, slug, description, parent category, and sort order.
- Keep slug optional on create so the backend can derive it from the name.
- Deleting a category can fail with `Category is in use` if it has child categories or content.
- Parent selection should exclude the category currently being edited; backend remains the source of truth for cycle prevention.

### Verification

- `pnpm --filter @worker-blog/admin test` passed: 6 files, 21 tests.
- `pnpm --filter @worker-blog/admin type-check` passed after changing sort order parsing to `valueAsNumber`.
- `pnpm --filter @worker-blog/admin build` passed with the existing large client chunk warning.
- `git diff --check` passed.

### Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| `z.coerce.number()` resolver input type did not match `react-hook-form` form value type during type-check. | Used coercion in `categoryFormSchema` for sort order. | Changed schema to `z.number().int()` and registered the number input with `valueAsNumber`. |
