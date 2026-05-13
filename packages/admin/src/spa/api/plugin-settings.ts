import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  PluginSettingsResponse,
  UpdatePluginSettingsRequest,
  UpdatePluginSettingsResponse,
} from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export function usePluginSettings(pluginId: string) {
  return useQuery<PluginSettingsResponse>({
    queryKey: ['admin', 'plugin-settings', pluginId],
    queryFn: () => adminFetch<PluginSettingsResponse>(`/api/admin/plugin-settings/${pluginId}/settings`),
    enabled: Boolean(pluginId),
  })
}

export function useUpdatePluginSettings(pluginId: string) {
  const qc = useQueryClient()
  return useMutation<UpdatePluginSettingsResponse, Error, UpdatePluginSettingsRequest>({
    mutationFn: (data) =>
      adminFetch<UpdatePluginSettingsResponse>(`/api/admin/plugin-settings/${pluginId}/settings`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'plugin-settings', pluginId] })
      qc.invalidateQueries({ queryKey: ['admin', 'plugins'] })
    },
  })
}
