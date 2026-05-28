import { describe, expect, it } from 'vitest'
import { validateContentData } from './schema-validator'

describe('schema validator', () => {
  it('validates data against collection schema properties', () => {
    const result = validateContentData(
      {
        type: 'object',
        properties: {
          body: { type: 'string' },
          featured: { type: 'boolean' },
        },
        required: ['body'],
      },
      { body: 'Hello', featured: true, extra: 'nope' },
    )

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Unknown field "extra"')
  })

  it('uses system fields for validation without adding them to content data', () => {
    const result = validateContentData(
      {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['title'],
      },
      { body: 'Hello' },
      { title: 'Post title' },
    )

    expect(result).toEqual({
      valid: true,
      errors: [],
      data: { body: 'Hello' },
    })
  })
})
