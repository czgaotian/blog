import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CategoryListResponse,
  CategoryDetailResponse,
  CreateCategoryRequest,
  CreateTagRequest,
  MutateCategoryResponse,
  MutateTagResponse,
  UpdateCategoryRequest,
  TagDetailResponse,
  TagListResponse,
  UpdateTagRequest,
} from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export function useCategoriesList() {
  return useQuery<CategoryListResponse>({
    queryKey: ['admin', 'categories'],
    queryFn: () => adminFetch<CategoryListResponse>('/api/admin/categories'),
  })
}

export function useCategoryDetail(id: string) {
  return useQuery<CategoryDetailResponse>({
    queryKey: ['admin', 'categories', id],
    queryFn: () => adminFetch<CategoryDetailResponse>(`/api/admin/categories/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation<MutateCategoryResponse, Error, CreateCategoryRequest>({
    mutationFn: (data) =>
      adminFetch<MutateCategoryResponse>('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
    },
  })
}

export function useUpdateCategory(id: string) {
  const qc = useQueryClient()
  return useMutation<MutateCategoryResponse, Error, UpdateCategoryRequest>({
    mutationFn: (data) =>
      adminFetch<MutateCategoryResponse>(`/api/admin/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
      qc.invalidateQueries({ queryKey: ['admin', 'categories', id] })
    },
  })
}

export function useDeleteCategory(id: string) {
  const qc = useQueryClient()
  return useMutation<MutateCategoryResponse, Error, void>({
    mutationFn: () =>
      adminFetch<MutateCategoryResponse>(`/api/admin/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
    },
  })
}

export function useTagsList() {
  return useQuery<TagListResponse>({
    queryKey: ['admin', 'tags'],
    queryFn: () => adminFetch<TagListResponse>('/api/admin/tags'),
  })
}

export function useTagDetail(id: string) {
  return useQuery<TagDetailResponse>({
    queryKey: ['admin', 'tags', id],
    queryFn: () => adminFetch<TagDetailResponse>(`/api/admin/tags/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation<MutateTagResponse, Error, CreateTagRequest>({
    mutationFn: (data) =>
      adminFetch<MutateTagResponse>('/api/admin/tags', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'tags'] })
    },
  })
}

export function useUpdateTag(id: string) {
  const qc = useQueryClient()
  return useMutation<MutateTagResponse, Error, UpdateTagRequest>({
    mutationFn: (data) =>
      adminFetch<MutateTagResponse>(`/api/admin/tags/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'tags'] })
      qc.invalidateQueries({ queryKey: ['admin', 'tags', id] })
    },
  })
}

export function useDeleteTag(id: string) {
  const qc = useQueryClient()
  return useMutation<MutateTagResponse, Error, void>({
    mutationFn: () =>
      adminFetch<MutateTagResponse>(`/api/admin/tags/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'tags'] })
    },
  })
}
