import { generateHTML } from '@tiptap/html'
import type { JSONContent } from '@tiptap/core'
import { sanitizeRichText } from '@worker-blog/shared/utils'
import { createContentRenderExtensions } from '../schema/extensions'

export function renderTiptapJsonToHtml(document: JSONContent): string {
  return sanitizeRichText(generateHTML(document, createContentRenderExtensions()))
}
