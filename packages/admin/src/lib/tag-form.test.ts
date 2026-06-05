import { describe, expect, it } from 'vitest'
import {
  EMPTY_TAG_FORM_VALUES,
  detailToTagFormValues,
  tagFormSchema,
  tagFormToCreateRequest,
  tagFormToUpdateRequest,
} from './tag-form'

describe('tag form', () => {
  it('converts empty optional fields for create requests', () => {
    expect(tagFormToCreateRequest({
      ...EMPTY_TAG_FORM_VALUES,
      name: 'Announcements',
    })).toEqual({
      name: 'Announcements',
      description: null,
      color: '#64748b',
    })
  })

  it('keeps slug optional so the server can generate it on create', () => {
    expect(tagFormToCreateRequest({
      ...EMPTY_TAG_FORM_VALUES,
      name: 'Release Notes',
      slug: 'release-notes',
    })).toMatchObject({
      slug: 'release-notes',
    })
  })

  it('validates hex colors for the colorpicker workflow', () => {
    expect(tagFormSchema.safeParse({
      ...EMPTY_TAG_FORM_VALUES,
      name: 'Good',
      color: '#22c55e',
    }).success).toBe(true)
    expect(tagFormSchema.safeParse({
      ...EMPTY_TAG_FORM_VALUES,
      name: 'Bad',
      color: 'green',
    }).success).toBe(false)
  })

  it('maps detail responses into form values', () => {
    expect(detailToTagFormValues({
      id: 'tag-1',
      name: 'News',
      slug: 'news',
      description: null,
      color: '#0f172a',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    })).toEqual({
      name: 'News',
      slug: 'news',
      description: '',
      color: '#0f172a',
    })
  })

  it('converts update requests', () => {
    expect(tagFormToUpdateRequest({
      ...EMPTY_TAG_FORM_VALUES,
      name: 'Updated',
      description: 'Used in changelog posts',
      color: '#f97316',
    })).toEqual({
      name: 'Updated',
      description: 'Used in changelog posts',
      color: '#f97316',
    })
  })
})
