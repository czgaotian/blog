import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  CollectionsListResponse,
  CollectionDetailResponse,
  MutateCollectionResponse,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  CreateFieldRequest,
  UpdateFieldRequest,
} from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export interface CollectionsFilters {
  search?: string
}

export function useCollectionsList(filters: CollectionsFilters = {}) {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  const qs = params.toString()
  return useQuery<CollectionsListResponse>({
    queryKey: ['admin', 'collections', filters],
    queryFn: () => adminFetch<CollectionsListResponse>(`/admin/api/collections${qs ? `?${qs}` : ''}`),
  })
}

export function useCollectionDetail(id: string) {
  return useQuery<CollectionDetailResponse>({
    queryKey: ['admin', 'collections', id],
    queryFn: () => adminFetch<CollectionDetailResponse>(`/admin/api/collections/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateCollection() {
  const qc = useQueryClient()
  return useMutation<MutateCollectionResponse, Error, CreateCollectionRequest>({
    mutationFn: (data) =>
      adminFetch<MutateCollectionResponse>('/admin/api/collections', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'collections'] })
    },
  })
}

export function useUpdateCollection(id: string) {
  const qc = useQueryClient()
  return useMutation<MutateCollectionResponse, Error, UpdateCollectionRequest>({
    mutationFn: (data) =>
      adminFetch<MutateCollectionResponse>(`/admin/api/collections/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'collections'] })
    },
  })
}

export function useDeleteCollection(id: string) {
  const qc = useQueryClient()
  return useMutation<MutateCollectionResponse, Error, void>({
    mutationFn: () =>
      adminFetch<MutateCollectionResponse>(`/admin/api/collections/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'collections'] })
    },
  })
}

export function useCreateField(collectionId: string) {
  const qc = useQueryClient()
  return useMutation<MutateCollectionResponse, Error, CreateFieldRequest>({
    mutationFn: (data) =>
      adminFetch<MutateCollectionResponse>(`/admin/api/collections/${collectionId}/fields`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'collections', collectionId] })
    },
  })
}

export function useUpdateField(collectionId: string, fieldId: string) {
  const qc = useQueryClient()
  return useMutation<MutateCollectionResponse, Error, UpdateFieldRequest>({
    mutationFn: (data) =>
      adminFetch<MutateCollectionResponse>(`/admin/api/collections/${collectionId}/fields/${fieldId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'collections', collectionId] })
    },
  })
}

export function useDeleteField(collectionId: string, fieldId: string) {
  const qc = useQueryClient()
  return useMutation<MutateCollectionResponse, Error, void>({
    mutationFn: () =>
      adminFetch<MutateCollectionResponse>(`/admin/api/collections/${collectionId}/fields/${fieldId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'collections', collectionId] })
    },
  })
}
