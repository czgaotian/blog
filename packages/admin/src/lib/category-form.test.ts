import { describe, expect, it } from 'vitest'
import {
  EMPTY_CATEGORY_FORM_VALUES,
  categoryFormSchema,
  categoryFormToCreateRequest,
  categoryFormToUpdateRequest,
  detailToCategoryFormValues,
} from './category-form'

describe('category form', () => {
  it('converts empty optional fields for create requests', () => {
    expect(categoryFormToCreateRequest({
      ...EMPTY_CATEGORY_FORM_VALUES,
      name: 'Writing',
    })).toEqual({
      name: 'Writing',
      description: null,
      parentId: null,
      sortOrder: 0,
    })
  })

  it('keeps slug optional so the server can generate it on create', () => {
    expect(categoryFormToCreateRequest({
      ...EMPTY_CATEGORY_FORM_VALUES,
      name: 'Product Updates',
      slug: 'product-updates',
    })).toMatchObject({
      slug: 'product-updates',
    })
  })

  it('validates numeric sort order', () => {
    expect(categoryFormSchema.safeParse({
      ...EMPTY_CATEGORY_FORM_VALUES,
      name: 'Guides',
      sortOrder: 12,
    }).success).toBe(true)
    expect(categoryFormSchema.safeParse({
      ...EMPTY_CATEGORY_FORM_VALUES,
      name: 'Guides',
      sortOrder: 12.5,
    }).success).toBe(false)
  })

  it('maps detail responses into form values', () => {
    expect(detailToCategoryFormValues({
      id: 'category-1',
      name: 'Docs',
      slug: 'docs',
      description: null,
      parentId: 'parent-1',
      sortOrder: 3,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    })).toEqual({
      name: 'Docs',
      slug: 'docs',
      description: '',
      parentId: 'parent-1',
      sortOrder: 3,
    })
  })

  it('converts update requests', () => {
    expect(categoryFormToUpdateRequest({
      ...EMPTY_CATEGORY_FORM_VALUES,
      name: 'Updated',
      parentId: 'parent-1',
      sortOrder: 10,
    })).toEqual({
      name: 'Updated',
      description: null,
      parentId: 'parent-1',
      sortOrder: 10,
    })
  })
})
