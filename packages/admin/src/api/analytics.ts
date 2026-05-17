import { useQuery } from '@tanstack/react-query'
import type { AdminApiResponse, AnalyticsAdminDashboardData } from '@worker-blog/shared/admin-api'
import { AdminApiError, adminFetch } from './client'

const BASE_PATH = '/api/plugins/analytics'

function unwrapAdminResponse<T>(response: AdminApiResponse<T>): T {
  if (!response.success) {
    throw new AdminApiError(response.error, 500, response)
  }

  return response.data
}

export function useAnalyticsAdmin() {
  return useQuery<AnalyticsAdminDashboardData>({
    queryKey: ['plugins', 'analytics'],
    queryFn: async () => unwrapAdminResponse(await adminFetch<AdminApiResponse<AnalyticsAdminDashboardData>>(BASE_PATH)),
  })
}
