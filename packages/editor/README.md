# @worker-blog/editor

Shared rich-text editor package for Worker Blog. It wraps Tiptap v3 into a reusable React editor for the admin UI and exposes server-side helpers for rendering stored Tiptap JSON into sanitized HTML.

## Responsibilities

- Provide the admin article body editor as a controlled React component.
- Keep the editable Tiptap extension set and read-only rendering extension set in sync.
- Define the image upload contract used by editor integrations.
- Export shared Tiptap JSON helpers so admin, server, and shared contracts use the same document shape.
- Render persisted Tiptap JSON to sanitized HTML on the server.

## Public API

Import from the package root:

```ts
import {
  Editor,
  emptyTiptapDocument,
  renderTiptapJsonToHtml,
  type JSONContent,
  type UploadFunction,
} from "@worker-blog/editor";
```

### `Editor`

Client-only React component for editing a Tiptap JSON document.

```tsx
import { Editor, type JSONContent, type UploadFunction } from "@worker-blog/editor";

const uploadImage: UploadFunction = async (file, onProgress, abortSignal) => {
  const formData = new FormData();
  formData.append("file", file);

  onProgress?.({ progress: 10 });

  const response = await fetch("/api/admin/media", {
    method: "POST",
    body: formData,
    signal: abortSignal,
  });

  if (!response.ok) {
    throw new Error("Image upload failed");
  }

  const image = await response.json();
  onProgress?.({ progress: 100 });

  return {
    src: image.url,
    mediaId: image.id,
    alt: image.alt ?? null,
    title: image.title ?? null,
    width: image.width ?? null,
    height: image.height ?? null,
  };
};

export function BodyField({
  value,
  onChange,
}: {
  value: JSONContent;
  onChange: (value: JSONContent) => void;
}) {
  return <Editor value={value} onChange={onChange} uploadImage={uploadImage} />;
}
```

Props:

| Prop | Type | Description |
| --- | --- | --- |
| `value` | `JSONContent \| undefined` | Controlled Tiptap document. Defaults to `emptyTiptapDocument`. |
| `onChange` | `(value: JSONContent) => void` | Called with `editor.getJSON()` whenever the document changes. |
| `uploadImage` | `UploadFunction \| undefined` | Upload handler for inserted images. Defaults to a placeholder/demo uploader. Production callers should pass their own implementation. |

### `UploadFunction`

Image upload function used by the image upload node.

```ts
type UploadFunction = (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal,
) => Promise<UploadedImage>;
```

The editor enforces a maximum file size of 5 MB and allows up to 3 images per upload node. The returned image object can include metadata used by the custom image node:

```ts
interface UploadedImage {
  src: string;
  mediaId?: string | null;
  alt?: string | null;
  title?: string | null;
  width?: number | null;
  height?: number | null;
}
```

### `emptyTiptapDocument`

Default empty document used when creating content or initializing a form:

```ts
import { emptyTiptapDocument } from "@worker-blog/editor";

const initialBody = structuredClone(emptyTiptapDocument);
```

Clone it before placing it in mutable form state.

### `renderTiptapJsonToHtml`

Server-side renderer for persisted content:

```ts
import { renderTiptapJsonToHtml, type JSONContent } from "@worker-blog/editor";

export function renderBody(bodyJson: JSONContent) {
  return renderTiptapJsonToHtml(bodyJson);
}
```

This helper uses the read-only Tiptap extension set from `createContentRenderExtensions()` and sanitizes the generated HTML with `@worker-blog/shared/utils/sanitize`.

## Supported Editing Features

The editor currently includes:

- Undo and redo.
- Headings 1-4.
- Bullet, ordered, and task lists.
- Blockquotes and code blocks with lowlight/highlight.js syntax highlighting.
- Bold, italic, strike, inline code, underline, superscript, and subscript.
- Multicolor highlight marks.
- Links.
- Text alignment for headings and paragraphs.
- Horizontal rules.
- Image upload and image rendering.
- Typography replacements from Tiptap.

## Current Consumers

- `packages/admin` uses `Editor` in the content form for `bodyJson`.
- `packages/server` uses `renderTiptapJsonToHtml` when rendering content.
- `packages/shared` imports `JSONContent` for admin API request and response contracts.

## Development

From the repository root:

```bash
pnpm --filter @worker-blog/editor type-check
pnpm --filter @worker-blog/editor test
```

Package entrypoint:

```ts
// packages/editor/src/index.ts
export type { JSONContent } from "@tiptap/core";
export type { UploadedImage, UploadFunction } from "./components/tiptap-node/image-upload-node/image-upload-node-extension";

export * from "./lib/tiptap-utils";
export * from "./lib/server";
export * from "./editor";
```

## Notes

- Keep reusable contracts, schemas, and pure helpers in `packages/shared` when they need to be consumed across packages.
- Keep editor-specific UI primitives, hooks, node views, and Tiptap extension implementation details inside this package.
- Do not edit migration files when changing editor data usage.
