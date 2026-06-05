import { useQuery } from '@tanstack/react-query'
import type { CategoryListResponse, TagListResponse } from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export function useCategoriesList() {
  return useQuery<CategoryListResponse>({
    queryKey: ['admin', 'categories'],
    queryFn: () => adminFetch<CategoryListResponse>('/api/admin/categories'),
  })
}

export function useTagsList() {
  return useQuery<TagListResponse>({
    queryKey: ['admin', 'tags'],
    queryFn: () => adminFetch<TagListResponse>('/api/admin/tags'),
  })
}
