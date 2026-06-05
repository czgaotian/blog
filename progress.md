# Content Body JSON/HTML Progress

## 2026-06-06

- Started implementation for server/shared content body JSON + cached HTML design.
- Confirmed scope is `packages/shared` and `packages/server`; admin implementation remains untouched.
- Replaced previous planning files with the current content body storage plan.
- Added shared Tiptap document schema, `bodyJson` write contracts, `bodyHtml` response boundary, and contract tests.
- Updated server Drizzle schema source to use `body_json` and `body_html`; no migration files were modified.
- Added server-side Tiptap JSON to sanitized HTML renderer.
- Replaced the initial hand-written renderer with Tiptap `generateHTML`.
- Configured server rendering extensions to mirror admin editor usage: StarterKit with custom horizontal rule handling, TextAlign, TaskList/TaskItem, Highlight, Image, Typography, Superscript, Subscript, and an `imageUpload` placeholder node.
- Added Tiptap rendering dependencies to `packages/server/package.json` and updated `pnpm-lock.yaml`.
- Updated content domain create/update/restore/version behavior to store JSON as source and generate HTML for published content.
- Updated admin content detail mapping to return `bodyJson/bodyHtml`.
- Updated public content detail to read `body_html` and only serve published, non-deleted content; category/tag list mapping no longer returns body content.
- Verification passed for shared tests, server focused tests, shared/server TypeScript, and `git diff --check`.
- Re-ran server focused tests and server TypeScript after switching to Tiptap `generateHTML`; both passed.
- Root `pnpm type-check` remains blocked by pre-existing missing `packages/editor/tsconfig.json`.
