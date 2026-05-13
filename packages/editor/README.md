# @worker-blog/editor

Tiptap-based rich text editor components for Worker Blog.

## Usage

```tsx
import { useState } from 'react'
import { TiptapEditor } from '@worker-blog/editor'
import '@worker-blog/editor/styles.css'

export function ContentEditor() {
  const [html, setHtml] = useState('<p>Hello world</p>')

  return (
    <TiptapEditor
      value={html}
      placeholder="Write your post..."
      toolbar="full"
      onChange={setHtml}
    />
  )
}
```

## Props

- `value`: controlled HTML value.
- `defaultValue`: initial HTML for uncontrolled usage.
- `placeholder`: empty editor placeholder text.
- `disabled`: disables editing and toolbar actions.
- `toolbar`: `minimal`, `standard`, or `full`.
- `onChange`: called with the current HTML on every editor update.
- `onBlur`: called with the current HTML when the editor loses focus.
