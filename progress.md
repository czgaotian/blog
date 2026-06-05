# Editor Scoped CSS Migration Progress

## 2026-06-05

- Started editor style migration.
- Replaced previous planning files with the current editor-scoped CSS migration plan.
- Confirmed SCSS usage spans editor root styles, Tiptap nodes, UI primitives, toolbar/popover/dropdown/link/highlight components, and style variables.
- Initial Sass conversion command failed because the working directory and input paths were mismatched; will rerun from the repository root.
- Root-level `pnpm exec sass` also failed because Sass is only exposed under the editor package; switching to the explicit editor package binary.
- Converted editor SCSS files to plain CSS files and updated all style imports to `.css`.
- Removed old SCSS files and the `scss.d.ts` declaration.
- Added `.tiptap-editor` as the `SimpleEditor` root scope.
- Scoped CSS variables and component selectors under `.tiptap-editor`, with dark mode under `.dark .tiptap-editor`.
- Removed template-level body/html/root/global scrollbar styles and made the simple editor wrapper embeddable.
- Kept popover/dropdown/tooltip floating content inside the editor DOM by default so scoped styles still apply.
- Removed Sass dev dependencies from the editor package.
- Added `css.d.ts` so TypeScript accepts side-effect CSS imports.
- Adjusted tooltip context typing to avoid duplicated React type conflicts from Floating UI.
- Verification passed: editor type-check, root type-check, and `git diff --check`.
