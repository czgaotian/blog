import { useQuery } from '@tanstack/react-query'
import type { DashboardResponse } from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export function useDashboard() {
  return useQuery<DashboardResponse>({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminFetch<DashboardResponse>('/api/admin/dashboard'),
  })
}
