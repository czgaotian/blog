import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  MediaListResponse,
  MediaDetailResponse,
  UploadMediaResponse,
  MutateMediaResponse,
  UpdateMediaRequest,
} from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export interface MediaFilters {
  page?: number
  limit?: number
  folder?: string
  type?: string
  search?: string
}

export function useMediaList(filters: MediaFilters = {}) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.folder) params.set('folder', filters.folder)
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
    mutationFn: async (formData) => {
      const res = await fetch('/api/media/upload-multiple', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error((err as any).error || 'Upload failed')
      }
      return res.json()
    },
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
