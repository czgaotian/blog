import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  UserProfileResponse,
  MutateProfileResponse,
  UpdateProfileRequest,
  ChangePasswordRequest,
  ActivityLogsListResponse,
} from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export function useProfile() {
  return useQuery<UserProfileResponse>({
    queryKey: ['admin', 'profile'],
    queryFn: () => adminFetch<UserProfileResponse>('/api/admin/profile'),
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation<MutateProfileResponse, Error, UpdateProfileRequest>({
    mutationFn: (data) =>
      adminFetch<MutateProfileResponse>('/api/admin/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'profile'] })
    },
  })
}

export function useChangePassword() {
  return useMutation<MutateProfileResponse, Error, ChangePasswordRequest>({
    mutationFn: (data) =>
      adminFetch<MutateProfileResponse>('/api/admin/profile/password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  })
}

export function useUploadAvatar() {
  const qc = useQueryClient()
  return useMutation<{ message: string; avatarUrl: string }, Error, File>({
    mutationFn: (file) => {
      const fd = new FormData()
      fd.append('avatar', file)
      return adminFetch<{ message: string; avatarUrl: string }>('/api/admin/profile/avatar', {
        method: 'POST',
        body: fd,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'profile'] })
    },
  })
}

export interface ActivityLogsFilters {
  page?: number
  limit?: number
  action?: string
  resourceType?: string
  dateFrom?: string
  dateTo?: string
  userId?: string
}

export function useActivityLogs(filters: ActivityLogsFilters = {}) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.action) params.set('action', filters.action)
  if (filters.resourceType) params.set('resource_type', filters.resourceType)
  if (filters.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters.dateTo) params.set('date_to', filters.dateTo)
  if (filters.userId) params.set('user_id', filters.userId)
  const qs = params.toString()
  return useQuery<ActivityLogsListResponse>({
    queryKey: ['admin', 'activity-logs', filters],
    queryFn: () => adminFetch<ActivityLogsListResponse>(`/api/admin/users/activity-logs${qs ? `?${qs}` : ''}`),
  })
}

export function activityLogsExportUrl(filters: ActivityLogsFilters = {}) {
  const params = new URLSearchParams()
  if (filters.action) params.set('action', filters.action)
  if (filters.resourceType) params.set('resource_type', filters.resourceType)
  if (filters.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters.dateTo) params.set('date_to', filters.dateTo)
  if (filters.userId) params.set('user_id', filters.userId)
  const qs = params.toString()
  return `/api/admin/users/activity-logs/export${qs ? `?${qs}` : ''}`
}
