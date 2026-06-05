import { describe, expect, it } from 'vitest'
import { readContentListFilters, writeContentListFilters } from './content-list-filters'

describe('content list filters', () => {
  it('reads valid filters and normalizes invalid values', () => {
    expect(readContentListFilters(new URLSearchParams('page=3&q=hello&status=draft&categoryId=c1&tagId=t1'))).toEqual({
      page: 3,
      search: 'hello',
      status: 'draft',
      categoryId: 'c1',
      tagId: 't1',
    })
    expect(readContentListFilters(new URLSearchParams('page=-2&status=unknown'))).toMatchObject({
      page: 1,
      status: 'all',
    })
  })

  it('omits default values when writing filters', () => {
    expect(writeContentListFilters({
      page: 1,
      search: '',
      status: 'all',
      categoryId: '',
      tagId: '',
    }).toString()).toBe('')

    expect(writeContentListFilters({
      page: 2,
      search: 'hello',
      status: 'published',
      categoryId: 'c1',
      tagId: 't1',
    }).toString()).toBe('page=2&q=hello&status=published&categoryId=c1&tagId=t1')
  })
})
