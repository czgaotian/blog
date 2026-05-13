import { useQuery } from '@tanstack/react-query'
import type { PluginsListResponse } from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export function usePluginsList() {
  return useQuery<PluginsListResponse>({
    queryKey: ['admin', 'plugins'],
    queryFn: () => adminFetch<PluginsListResponse>('/api/admin/plugins'),
  })
}
