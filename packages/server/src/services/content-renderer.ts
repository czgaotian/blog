import { generateHTML } from '@tiptap/html'
import { mergeAttributes, Node, type JSONContent } from '@tiptap/core'
import { Image } from '@tiptap/extension-image'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { TextAlign } from '@tiptap/extension-text-align'
import { Typography } from '@tiptap/extension-typography'
import { Highlight } from '@tiptap/extension-highlight'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import TiptapHorizontalRule from '@tiptap/extension-horizontal-rule'
import StarterKit from '@tiptap/starter-kit'
import type { TiptapDocument } from '@worker-blog/shared/admin-api'
import { sanitizeRichText } from '@worker-blog/shared/utils'

const HorizontalRule = TiptapHorizontalRule.extend({
  renderHTML() {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, { 'data-type': this.name }),
      ['hr'],
    ]
  },
})

const ImageUploadNode = Node.create({
  name: 'imageUpload',
  group: 'block',
  draggable: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      accept: { default: 'image/*' },
      limit: { default: 1 },
      maxSize: { default: 0 },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="image-upload"]' }]
  },

  renderHTML() {
    return ['div', { 'data-type': 'image-upload', hidden: 'hidden' }]
  },
})

const contentRenderExtensions = [
  StarterKit.configure({
    horizontalRule: false,
    link: {
      openOnClick: false,
      enableClickSelection: true,
    },
  }),
  HorizontalRule,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Highlight.configure({ multicolor: true }),
  Image,
  Typography,
  Superscript,
  Subscript,
  ImageUploadNode,
]

export function renderTiptapJsonToHtml(document: TiptapDocument): string {
  return sanitizeRichText(generateHTML(document as JSONContent, contentRenderExtensions))
}
