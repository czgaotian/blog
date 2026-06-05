import type { ContentStatus } from '@worker-blog/shared/admin-api'

export interface ContentListFilters {
  page: number
  search: string
  status: ContentStatus | 'all'
  categoryId: string
  tagId: string
}

export function readContentListFilters(params: URLSearchParams): ContentListFilters {
  const page = Number(params.get('page') || '1')
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    search: params.get('q') || '',
    status: readStatus(params.get('status')),
    categoryId: params.get('categoryId') || '',
    tagId: params.get('tagId') || '',
  }
}

export function writeContentListFilters(filters: ContentListFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.page > 1) params.set('page', String(filters.page))
  if (filters.search) params.set('q', filters.search)
  if (filters.status !== 'all') params.set('status', filters.status)
  if (filters.categoryId) params.set('categoryId', filters.categoryId)
  if (filters.tagId) params.set('tagId', filters.tagId)
  return params
}

function readStatus(value: string | null): ContentListFilters['status'] {
  if (value === 'draft' || value === 'review' || value === 'scheduled' || value === 'published'
    || value === 'archived' || value === 'deleted') {
    return value
  }
  return 'all'
}
