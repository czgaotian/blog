import { describe, expect, it } from 'vitest'
import { emptyTiptapDocument, tiptapDocumentSchema } from './schema'

describe('editor Tiptap document schema', () => {
  it('accepts doc-root JSONContent', () => {
    const parsed = tiptapDocumentSchema.parse({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    })

    expect(parsed.type).toBe('doc')
  })

  it('provides an empty doc-root document', () => {
    expect(emptyTiptapDocument).toEqual({ type: 'doc', content: [] })
  })

  it('rejects non-document Tiptap roots', () => {
    expect(() => tiptapDocumentSchema.parse({
      type: 'paragraph',
      content: [{ type: 'text', text: 'Nope' }],
    })).toThrow()
  })
})
