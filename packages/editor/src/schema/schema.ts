import type { JSONContent } from '@tiptap/core'
import { z } from 'zod'

export const emptyTiptapDocument: JSONContent = {
  type: 'doc',
  content: [],
}

export const tiptapDocumentSchema = z.custom<JSONContent>(
  (value) => typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && 'type' in value
    && value.type === 'doc',
  'Body must be a doc-root Tiptap JSONContent document',
)
