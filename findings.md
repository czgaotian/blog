# Editor Scoped CSS Migration Findings

## Initial Inventory

- `packages/editor/src/index.ts` imports `styles.css`, which imports SCSS partials.
- `SimpleEditor` imports node SCSS files and `simple-editor.scss`.
- Primitive and UI components import SCSS files directly.
- `simple-editor.scss` currently applies global styles to `body`, `html`, `#root`, `#app`, all scrollbars, and universal scrollbar behavior.
- Several style partials use `:root` variables and Sass nesting.
- `packages/editor/package.json` declares `sass` and `sass-embedded` as dev dependencies.
- `packages/editor/src/scss.d.ts` only exists for SCSS module declarations.

## Target Shape

- All style files in editor should be plain `.css`.
- Variables should live under `.tiptap-editor`, with dark overrides under `.dark .tiptap-editor`.
- Component and ProseMirror selectors should be scoped under `.tiptap-editor`.
- The simple editor should use container-sized layout instead of `100vw`/`100vh`.
