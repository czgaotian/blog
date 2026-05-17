import { useQuery } from '@tanstack/react-query'
import type { AdminApiResponse, WorkflowAdminDashboardData } from '@worker-blog/shared/admin-api'
import { AdminApiError, adminFetch } from './client'

const BASE_PATH = '/api/plugins/workflow'

function unwrapAdminResponse<T>(response: AdminApiResponse<T>): T {
  if (!response.success) {
    throw new AdminApiError(response.error, 500, response)
  }

  return response.data
}

export function useWorkflowAdmin() {
  return useQuery<WorkflowAdminDashboardData>({
    queryKey: ['plugins', 'workflow'],
    queryFn: async () => unwrapAdminResponse(await adminFetch<AdminApiResponse<WorkflowAdminDashboardData>>(BASE_PATH)),
  })
}
