import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  UserProfileResponse,
  MutateProfileResponse,
  UpdateProfileRequest,
  ChangePasswordRequest,
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
