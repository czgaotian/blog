# Editor Scoped CSS Migration Plan

## Goal

Remove SCSS from `packages/editor`, convert editor styles to plain CSS, and ensure editor styles only affect DOM inside the `.tiptap-editor` component scope while following admin dark mode via `.dark .tiptap-editor`.

## Scope

- Package: `packages/editor`.
- Do not modify migration files.
- Do not wire the editor into admin yet.
- Keep behavior unchanged except for style scoping and full-page layout cleanup.

## Phases

1. Inventory SCSS imports, global selectors, and package Sass dependencies. Status: complete.
2. Convert all `.scss` files to `.css` files and update TypeScript/CSS imports. Status: complete.
3. Scope variables and component selectors under `.tiptap-editor`, with dark mode via `.dark .tiptap-editor`. Status: complete.
4. Remove full-page/global style effects and make the simple editor embeddable. Status: complete.
5. Remove Sass-only package artifacts and dependencies. Status: complete.
6. Run verification and fix regressions. Status: complete.

## Decisions

- The editor root scope class is `.tiptap-editor`.
- Dark mode follows the host application: `.dark .tiptap-editor`.
- No naked `body`, `html`, `#root`, `#app`, universal scrollbar, or unscoped editor selectors should remain in editor styles.
- Convert Sass nesting to regular CSS rather than adding a new CSS module system.

## Verification

- `pnpm --filter @worker-blog/editor type-check` passed.
- `pnpm type-check` passed.
- `git diff --check` passed.

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| Sass reported every SCSS input as missing. | Ran `pnpm --dir packages/editor exec sass` while passing repo-root-relative paths. | Re-run Sass from the repository root so paths resolve correctly. |
| `pnpm exec sass` could not find the Sass command from the workspace root. | Tried root-level `pnpm exec sass`. | Use `packages/editor/node_modules/.bin/sass`, which is available from the editor package install. |
| TypeScript 6 rejected side-effect `.css` imports. | Replaced SCSS declaration by deleting `scss.d.ts`. | Added `packages/editor/src/css.d.ts`. |
| Tooltip context types conflicted because Floating UI resolved a different React type instance. | Tried hand-copying the Floating UI prop getter signatures. | Changed the context value to `ReturnType<typeof useTooltip>` and kept a narrow cast at the third-party ref boundary. |
