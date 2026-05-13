import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ContentListResponse,
  ContentDetailResponse,
  ContentVersionsResponse,
  MutateContentResponse,
  CreateContentRequest,
  UpdateContentRequest,
} from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export interface ContentFilters {
  page?: number
  limit?: number
  search?: string
  status?: string
  collectionId?: string
}

export function useContentList(filters: ContentFilters = {}) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.search) params.set('search', filters.search)
  if (filters.status) params.set('status', filters.status)
  if (filters.collectionId) params.set('collectionId', filters.collectionId)
  const qs = params.toString()

  return useQuery<ContentListResponse>({
    queryKey: ['admin', 'content', filters],
    queryFn: () => adminFetch<ContentListResponse>(`/api/admin/content${qs ? `?${qs}` : ''}`),
  })
}

export function useContentDetail(id: string) {
  return useQuery<ContentDetailResponse>({
    queryKey: ['admin', 'content', id],
    queryFn: () => adminFetch<ContentDetailResponse>(`/api/admin/content/${id}`),
    enabled: Boolean(id),
  })
}

export function useContentVersions(id: string) {
  return useQuery<ContentVersionsResponse>({
    queryKey: ['admin', 'content', id, 'versions'],
    queryFn: () => adminFetch<ContentVersionsResponse>(`/api/admin/content/${id}/versions`),
    enabled: Boolean(id),
  })
}

export function useCreateContent() {
  const qc = useQueryClient()
  return useMutation<MutateContentResponse, Error, CreateContentRequest>({
    mutationFn: (data) =>
      adminFetch<MutateContentResponse>('/api/admin/content', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content'] })
    },
  })
}

export function useUpdateContent(id: string) {
  const qc = useQueryClient()
  return useMutation<MutateContentResponse, Error, UpdateContentRequest>({
    mutationFn: (data) =>
      adminFetch<MutateContentResponse>(`/api/admin/content/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content'] })
    },
  })
}

export function useDeleteContent(id: string) {
  const qc = useQueryClient()
  return useMutation<MutateContentResponse, Error, void>({
    mutationFn: () =>
      adminFetch<MutateContentResponse>(`/api/admin/content/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content'] })
    },
  })
}

export function useRestoreContentVersion(id: string) {
  const qc = useQueryClient()
  return useMutation<MutateContentResponse, Error, number>({
    mutationFn: (version) =>
      adminFetch<MutateContentResponse>(`/api/admin/content/${id}/restore/${version}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'content', id] })
    },
  })
}
