import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  UserProfileCustomDataResponse,
  UserProfileSchemaData,
  UpdateUserProfileCustomDataRequest,
} from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export function useUserProfileSchema() {
  return useQuery<UserProfileSchemaData>({
    queryKey: ['admin', 'user-profiles', 'schema'],
    queryFn: () => adminFetch<UserProfileSchemaData>('/api/user-profiles/schema'),
  })
}

export function useUserProfileCustomData(userId?: string) {
  return useQuery<UserProfileCustomDataResponse>({
    queryKey: ['admin', 'user-profiles', userId],
    queryFn: () => adminFetch<UserProfileCustomDataResponse>(`/api/user-profiles/${userId}`),
    enabled: Boolean(userId),
  })
}

export function useUpdateUserProfileCustomData(userId?: string) {
  const qc = useQueryClient()

  return useMutation<{ success: true }, Error, UpdateUserProfileCustomDataRequest>({
    mutationFn: (data) =>
      adminFetch<{ success: true }>(`/api/user-profiles/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'user-profiles', userId] })
    },
  })
}
