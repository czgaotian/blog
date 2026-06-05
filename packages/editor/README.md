# @worker-blog/editor

Tiptap-based rich text editor package for Worker Blog.

This package currently wraps the [Tiptap Simple Editor template](https://tiptap.dev/docs/ui-components/templates/simple-editor). The template is MIT licensed and ships a ready-to-customize React editor with common open source Tiptap extensions and UI components.

## Usage

Import the editor component from a React client component:

```tsx
import { SimpleEditor } from "@worker-blog/editor"

export function PostEditorPage() {
  return <SimpleEditor />
}
```

`@worker-blog/editor` imports its stylesheet from the package entrypoint, so consumers should not import a separate `styles.css` subpath.

`SimpleEditor` accepts `value` and `onChange` props. It owns the Tiptap editor instance internally and emits HTML through `onChange`.

## Included Features

- Responsive toolbar with mobile-specific link and highlight panels.
- Light and dark mode toggle via the root `html.dark` class.
- Undo and redo controls.
- Heading levels 1-4.
- Bullet, ordered, and task lists.
- Blockquote and code block nodes.
- Bold, italic, strike, inline code, underline, superscript, and subscript marks.
- Multi-color highlight popover.
- Link editing popover.
- Left, center, right, and justified text alignment.
- Image upload UI with the template upload node.

## Tiptap Extensions

The editor config in `src/components/tiptap-templates/simple/simple-editor.tsx` registers:

- `StarterKit`
- `HorizontalRule`
- `TextAlign`
- `TaskList` and `TaskItem`
- `Highlight`
- `Image`
- `Typography`
- `Superscript` and `Subscript`
- `Selection`
- `ImageUploadNode`

## Styling

The package entrypoint imports `src/styles.css`, which imports the template variables and keyframe styles. The template components also import their own plain CSS files from the `src/components/tiptap-*` folders.

Editor styles are scoped under the `.tiptap-editor` root class. Dark mode follows the host application through `.dark .tiptap-editor`.

- `.simple-editor-wrapper` uses the available container width, with an embeddable minimum height and `70vh` maximum height.
- `.simple-editor-content` constrains the document width to `648px`.
- `simple-editor.css` imports the Google fonts used by the upstream template.

If this editor is embedded inside a smaller admin layout, adjust `simple-editor.css` rather than adding host-page global overrides.

## Image Upload

`ImageUploadNode` is configured with:

- `accept: "image/*"`
- `maxSize: 5MB`
- `limit: 3`
- `upload: handleImageUpload`

`handleImageUpload` in `src/lib/tiptap-utils.ts` is still the template/demo implementation: it simulates progress and returns `/images/tiptap-ui-placeholder-image.jpg`. Replace it with the real Worker Blog upload flow before relying on image uploads in production.

## Customization Pointers

- Public exports: `src/index.ts`.
- Toolbar composition: `MainToolbarContent` and `MobileToolbarContent` in `simple-editor.tsx`.
- Editor component: `src/components/tiptap-templates/simple/simple-editor.tsx`.
- Upload behavior and shared Tiptap helpers: `src/lib/tiptap-utils.ts`.
- Primitive UI components: `src/components/tiptap-ui-primitive`.
- Tiptap UI buttons and popovers: `src/components/tiptap-ui`.
- Node styles and node views: `src/components/tiptap-node`.

## Public API

All supported package usage should go through `@worker-blog/editor`.

The package root exports:

- `SimpleEditor`.
- Tiptap UI components, primitive components, icons, hooks, node extensions, and shared helpers.
- Component props and hook config types.
- Aliased helper names where upstream template files use common names like `shouldShowButton` or `canToggle`.

## Development

```bash
pnpm --filter @worker-blog/editor type-check
```

The imported template source has been converted to relative internal imports so consumers do not need to configure the template's original `@/...` alias.

## Upstream Reference

- Tiptap docs: <https://tiptap.dev/docs/ui-components/templates/simple-editor>
- Upstream install command for an existing project: `npx @tiptap/cli@latest add simple-editor`
- Upstream init command for a new project: `npx @tiptap/cli@latest init simple-editor`
