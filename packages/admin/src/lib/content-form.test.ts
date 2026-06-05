import { describe, expect, it } from 'vitest'
import {
  EMPTY_CONTENT_FORM_VALUES,
  contentFormSchema,
  contentFormToCreateRequest,
  contentFormToUpdateRequest,
} from './content-form'

describe('content form', () => {
  it('converts empty optional fields for create requests', () => {
    expect(contentFormToCreateRequest({
      ...EMPTY_CONTENT_FORM_VALUES,
      title: 'Hello world',
    })).toEqual({
      title: 'Hello world',
      excerpt: null,
      body: '',
      status: 'draft',
      categoryId: null,
      coverImageId: null,
      tagIds: [],
      metadata: {},
      publishedAt: null,
    })
  })

  it('preserves metadata for update requests', () => {
    expect(contentFormToUpdateRequest({
      ...EMPTY_CONTENT_FORM_VALUES,
      title: 'Updated',
      slug: 'updated',
    }, { seoTitle: 'Existing value' })).toMatchObject({
      title: 'Updated',
      slug: 'updated',
      metadata: { seoTitle: 'Existing value' },
    })
  })

  it('requires a future publish time for scheduled content', () => {
    const missing = contentFormSchema.safeParse({
      ...EMPTY_CONTENT_FORM_VALUES,
      title: 'Scheduled',
      status: 'scheduled',
    })
    const past = contentFormSchema.safeParse({
      ...EMPTY_CONTENT_FORM_VALUES,
      title: 'Scheduled',
      status: 'scheduled',
      publishedAt: '2020-01-01T12:00',
    })
    const future = contentFormSchema.safeParse({
      ...EMPTY_CONTENT_FORM_VALUES,
      title: 'Scheduled',
      status: 'scheduled',
      publishedAt: '2099-01-01T12:00',
    })

    expect(missing.success).toBe(false)
    expect(past.success).toBe(false)
    expect(future.success).toBe(true)
  })
})
