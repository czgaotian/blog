import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  BulkDeleteMediaResponse,
  MediaFileIdsRequest,
  MediaListFilters,
  MediaListResponse,
  MediaDetailResponse,
  UploadMediaResponse,
  MutateMediaResponse,
  UpdateMediaRequest,
} from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export type MediaFilters = Partial<MediaListFilters>

export function useMediaList(filters: MediaFilters = {}) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.type) params.set('type', filters.type)
  if (filters.search) params.set('search', filters.search)
  const qs = params.toString()

  return useQuery<MediaListResponse>({
    queryKey: ['admin', 'media', filters],
    queryFn: () => adminFetch<MediaListResponse>(`/api/media${qs ? `?${qs}` : ''}`),
  })
}

export function useMediaDetail(id: string) {
  return useQuery<MediaDetailResponse>({
    queryKey: ['admin', 'media', id],
    queryFn: () => adminFetch<MediaDetailResponse>(`/api/media/${id}`),
    enabled: Boolean(id),
  })
}

export function useUploadMedia() {
  const qc = useQueryClient()
  return useMutation<UploadMediaResponse, Error, FormData>({
    mutationFn: (formData) =>
      adminFetch<UploadMediaResponse>('/api/media/upload-multiple', {
        method: 'POST',
        body: formData,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'media'] })
    },
  })
}

export function useUpdateMedia(id: string) {
  const qc = useQueryClient()
  return useMutation<MutateMediaResponse, Error, UpdateMediaRequest>({
    mutationFn: (data) =>
      adminFetch<MutateMediaResponse>(`/api/media/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'media'] })
      qc.invalidateQueries({ queryKey: ['admin', 'media', id] })
    },
  })
}

export function useDeleteMedia(id: string) {
  const qc = useQueryClient()
  return useMutation<MutateMediaResponse, Error, void>({
    mutationFn: () =>
      adminFetch<MutateMediaResponse>(`/api/media/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'media'] })
    },
  })
}

export function useBulkDeleteMedia() {
  const qc = useQueryClient()
  return useMutation<BulkDeleteMediaResponse, Error, MediaFileIdsRequest>({
    mutationFn: (data) =>
      adminFetch<BulkDeleteMediaResponse>('/api/media/bulk-delete', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'media'] })
    },
  })
}
