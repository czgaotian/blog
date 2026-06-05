import { describe, expect, it } from 'vitest'
import { renderTiptapJsonToHtml } from './content-renderer'

describe('renderTiptapJsonToHtml', () => {
  it('renders common Tiptap nodes and escapes text', () => {
    const html = renderTiptapJsonToHtml({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Hello' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Use ' },
            { type: 'text', text: '<safe>', marks: [{ type: 'bold' }] },
          ],
        },
      ],
    })

    expect(html).toBe('<h2>Hello</h2><p>Use <strong>&lt;safe&gt;</strong></p>')
  })

  it('escapes unsafe text content before sanitizing generated HTML', () => {
    const html = renderTiptapJsonToHtml({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '<script>alert(1)</script>' },
          ],
        },
      ],
    })

    expect(html).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')
  })

  it('renders extensions used by the admin editor', () => {
    const html = renderTiptapJsonToHtml({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { textAlign: 'center' },
          content: [
            { type: 'text', text: 'Marked', marks: [{ type: 'highlight', attrs: { color: '#facc15' } }] },
            { type: 'text', text: '2', marks: [{ type: 'superscript' }] },
            { type: 'text', text: 'O', marks: [{ type: 'subscript' }] },
          ],
        },
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: true },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Done' }] }],
            },
          ],
        },
        { type: 'horizontalRule' },
        { type: 'image', attrs: { src: '/uploads/image.png', alt: 'Image alt' } },
        { type: 'imageUpload', attrs: { accept: 'image/*', limit: 3, maxSize: 5242880 } },
      ],
    })

    expect(html).toContain('text-align: center')
    expect(html).toContain('data-type="taskList"')
    expect(html).toContain('data-checked="true"')
    expect(html).toContain('data-type="horizontalRule"')
    expect(html).toContain('<mark')
    expect(html).toContain('<sup>2</sup>')
    expect(html).toContain('<sub>O</sub>')
    expect(html).toContain('<img src="/uploads/image.png" alt="Image alt">')
    expect(html).toContain('data-type="image-upload"')
    expect(html).toContain('hidden="hidden"')
  })
})
