import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  FormsListResponse,
  FormDetailResponse,
  MutateFormResponse,
  CreateFormRequest,
  UpdateFormRequest,
} from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export interface FormsFilters {
  search?: string
  category?: string
}

export function useFormsList(filters: FormsFilters = {}) {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.category) params.set('category', filters.category)
  const qs = params.toString()

  return useQuery<FormsListResponse>({
    queryKey: ['admin', 'forms', filters],
    queryFn: () => adminFetch<FormsListResponse>(`/admin/api/forms${qs ? `?${qs}` : ''}`),
  })
}

export function useFormDetail(id: string) {
  return useQuery<FormDetailResponse>({
    queryKey: ['admin', 'forms', id],
    queryFn: () => adminFetch<FormDetailResponse>(`/admin/api/forms/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateForm() {
  const qc = useQueryClient()
  return useMutation<MutateFormResponse, Error, CreateFormRequest>({
    mutationFn: (data) =>
      adminFetch<MutateFormResponse>('/admin/api/forms', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'forms'] })
    },
  })
}

export function useUpdateForm(id: string) {
  const qc = useQueryClient()
  return useMutation<MutateFormResponse, Error, UpdateFormRequest>({
    mutationFn: (data) =>
      adminFetch<MutateFormResponse>(`/admin/api/forms/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'forms'] })
    },
  })
}

export function useDeleteForm(id: string) {
  const qc = useQueryClient()
  return useMutation<MutateFormResponse, Error, void>({
    mutationFn: () =>
      adminFetch<MutateFormResponse>(`/admin/api/forms/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'forms'] })
    },
  })
}
