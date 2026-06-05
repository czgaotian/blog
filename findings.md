# Admin Content MVP Findings

## Existing Capabilities

- Admin content API already supports list filters, detail, create, update, soft delete, version list, and version restore.
- Category and tag list APIs already exist and expose shared response contracts.
- Media list API supports filtering to images and returns public/thumbnail URLs.
- Admin already uses React Router, TanStack Query, react-hook-form, Zod, and shadcn-style local UI components.

## Missing Admin Capabilities

- Content list is read-only and does not sync filters to the URL.
- No content create or edit route/page exists.
- No admin category/tag query hooks exist.
- No cover-image picker or version-history UI exists.

## Implementation Constraints

- Preserve unknown metadata during edits.
- Slug may be blank on create so the server generates it from the title.
- Scheduled content requires a future publish time.
- No rich-text editor, autosave, preview, metadata editor, or taxonomy management in this iteration.

## Completed Implementation

- Content list now supports URL-backed search, status/category/tag filters, create/edit navigation, and confirmed soft deletion.
- New and edit pages share a validated content form with textarea body, publishing controls, taxonomy selection, cover selection, and unsaved-change prompts.
- Edit pages support version history and confirmed restore.
- Content mutations invalidate list, detail, and version query caches as appropriate.

## Verification

- Admin tests: 4 files, 11 tests passed.
- Admin type-check passed.
- Admin production build passed with the existing large-chunk warning.
- `git diff --check` passed.
