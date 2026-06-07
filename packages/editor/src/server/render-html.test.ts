import { describe, expect, it } from 'vitest'
import { renderTiptapJsonToHtml } from './render-html'

describe('renderTiptapJsonToHtml', () => {
  it('renders the publishing-safe editor extension set', () => {
    const html = renderTiptapJsonToHtml({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2, textAlign: 'center' },
          content: [{ type: 'text', text: 'Hello' }],
        },
        {
          type: 'paragraph',
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
        {
          type: 'image',
          attrs: {
            src: '/uploads/image.png',
            alt: 'Image alt',
            mediaId: 'media_123',
            width: 1200,
            height: 800,
          },
        },
        { type: 'imageUpload', attrs: { accept: 'image/*', limit: 3, maxSize: 5242880 } },
      ],
    })

    expect(html).toContain('text-align: center')
    expect(html).toContain('Hello</h2>')
    expect(html).toContain('<mark')
    expect(html).toContain('<sup>2</sup>')
    expect(html).toContain('<sub>O</sub>')
    expect(html).toContain('data-type="taskList"')
    expect(html).toContain('data-checked="true"')
    expect(html).toContain('data-type="horizontalRule"')
    expect(html).toContain('src="/uploads/image.png"')
    expect(html).toContain('alt="Image alt"')
    expect(html).not.toContain('data-media-id')
    expect(html).toContain('width="1200"')
    expect(html).toContain('height="800"')
    expect(html).toContain('data-type="image-upload"')
    expect(html).toContain('hidden="hidden"')
  })

  it('escapes unsafe text before sanitizing generated HTML', () => {
    expect(renderTiptapJsonToHtml({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '<script>alert(1)</script>' }],
        },
      ],
    })).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')
  })
})
