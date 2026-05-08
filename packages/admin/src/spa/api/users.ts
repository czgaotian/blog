import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  UsersListResponse,
  UserDetailResponse,
  UpdateUserRequest,
  MutateUserResponse,
} from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export interface UsersFilters {
  page?: number
  limit?: number
  search?: string
}

export function useUsersList(filters: UsersFilters = {}) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.search) params.set('search', filters.search)
  const qs = params.toString()

  return useQuery<UsersListResponse>({
    queryKey: ['admin', 'users', filters],
    queryFn: () => adminFetch<UsersListResponse>(`/admin/api/users${qs ? `?${qs}` : ''}`),
  })
}

export function useUserDetail(id: string) {
  return useQuery<UserDetailResponse>({
    queryKey: ['admin', 'users', id],
    queryFn: () => adminFetch<UserDetailResponse>(`/admin/api/users/${id}`),
    enabled: Boolean(id),
  })
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient()
  return useMutation<MutateUserResponse, Error, UpdateUserRequest>({
    mutationFn: (data) =>
      adminFetch<MutateUserResponse>(`/admin/api/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

export function useDeleteUser(id: string) {
  const qc = useQueryClient()
  return useMutation<MutateUserResponse, Error, void>({
    mutationFn: () =>
      adminFetch<MutateUserResponse>(`/admin/api/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}
