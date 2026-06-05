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
