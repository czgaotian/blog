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
}

export function useContentsList(filters: ContentFilters = {}) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.search) params.set('search', filters.search)
  if (filters.status) params.set('status', filters.status)
  const qs = params.toString()

  return useQuery<ContentListResponse>({
    queryKey: ['admin', 'contents', filters],
    queryFn: () => adminFetch<ContentListResponse>(`/api/admin/contents${qs ? `?${qs}` : ''}`),
  })
}

export function useContentsDetail(id: string) {
  return useQuery<ContentDetailResponse>({
    queryKey: ['admin', 'contents', id],
    queryFn: () => adminFetch<ContentDetailResponse>(`/api/admin/contents/${id}`),
    enabled: Boolean(id),
  })
}

export function useContentsVersions(id: string) {
  return useQuery<ContentVersionsResponse>({
    queryKey: ['admin', 'contents', id, 'versions'],
    queryFn: () => adminFetch<ContentVersionsResponse>(`/api/admin/contents/${id}/versions`),
    enabled: Boolean(id),
  })
}

export function useCreateContents() {
  const qc = useQueryClient()
  return useMutation<MutateContentResponse, Error, CreateContentRequest>({
    mutationFn: (data) =>
      adminFetch<MutateContentResponse>('/api/admin/contents', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'contents'] })
    },
  })
}

export function useUpdateContents(id: string) {
  const qc = useQueryClient()
  return useMutation<MutateContentResponse, Error, UpdateContentRequest>({
    mutationFn: (data) =>
      adminFetch<MutateContentResponse>(`/api/admin/contents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'contents'] })
    },
  })
}

export function useDeleteContents(id: string) {
  const qc = useQueryClient()
  return useMutation<MutateContentResponse, Error, void>({
    mutationFn: () =>
      adminFetch<MutateContentResponse>(`/api/admin/contents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'contents'] })
    },
  })
}

export function useRestoreContentsVersion(id: string) {
  const qc = useQueryClient()
  return useMutation<MutateContentResponse, Error, number>({
    mutationFn: (version) =>
      adminFetch<MutateContentResponse>(`/api/admin/contents/${id}/restore/${version}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'contents', id] })
    },
  })
}
