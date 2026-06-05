import { describe, expect, it } from 'vitest'
import { createContentSchema, updateContentSchema } from './contents'

describe('content body contracts', () => {
  it('accepts JSONContent as content source', () => {
    const parsed = createContentSchema.parse({
      title: 'Draft',
      bodyJson: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
      },
    })

    expect(parsed.bodyJson.type).toBe('doc')
  })

  it('defaults create bodyJson to an empty Tiptap document', () => {
    const parsed = createContentSchema.parse({
      title: 'Draft',
    })

    expect(parsed.bodyJson).toEqual({ type: 'doc', content: [] })
  })

  it('rejects client-provided generated HTML in write requests', () => {
    expect(() => createContentSchema.parse({
      title: 'Draft',
      bodyJson: { type: 'doc', content: [] },
      bodyHtml: '<p>nope</p>',
    })).toThrow()

    expect(() => updateContentSchema.parse({
      bodyJson: { type: 'doc', content: [] },
      bodyHtml: '<p>nope</p>',
    })).toThrow()
  })
})
