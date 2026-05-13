import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  SettingsResponse,
  UpdateGeneralSettingsRequest,
  UpdateSecuritySettingsRequest,
  UpdateSettingsResponse,
} from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export function useSettings() {
  return useQuery<SettingsResponse>({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminFetch<SettingsResponse>('/api/admin/settings'),
  })
}

export function useUpdateGeneralSettings() {
  const qc = useQueryClient()
  return useMutation<UpdateSettingsResponse, Error, UpdateGeneralSettingsRequest>({
    mutationFn: (data) =>
      adminFetch<UpdateSettingsResponse>('/api/admin/settings/general', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] })
    },
  })
}

export function useUpdateSecuritySettings() {
  const qc = useQueryClient()
  return useMutation<UpdateSettingsResponse, Error, UpdateSecuritySettingsRequest>({
    mutationFn: (data) =>
      adminFetch<UpdateSettingsResponse>('/api/admin/settings/security', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] })
    },
  })
}
