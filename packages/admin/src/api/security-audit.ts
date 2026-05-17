import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AdminApiResponse,
  SecurityAuditAdminDashboardData,
  SecurityAuditPurgeResponse,
} from '@worker-blog/shared/admin-api'
import { AdminApiError, adminFetch } from './client'

const BASE_PATH = '/api/plugins/security-audit'

function unwrapAdminResponse<T>(response: AdminApiResponse<T>): T {
  if (!response.success) {
    throw new AdminApiError(response.error, 500, response)
  }

  return response.data
}

export function useSecurityAuditAdmin() {
  return useQuery<SecurityAuditAdminDashboardData>({
    queryKey: ['plugins', 'security-audit'],
    queryFn: async () => unwrapAdminResponse(await adminFetch<AdminApiResponse<SecurityAuditAdminDashboardData>>(BASE_PATH)),
  })
}

export function useReleaseSecurityAuditLockout() {
  const qc = useQueryClient()

  return useMutation<{ released: boolean }, Error, string>({
    mutationFn: async (key) =>
      unwrapAdminResponse(await adminFetch<AdminApiResponse<{ released: boolean }>>(`${BASE_PATH}/lockouts/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plugins', 'security-audit'] })
    },
  })
}

export function usePurgeSecurityAuditEvents() {
  const qc = useQueryClient()

  return useMutation<SecurityAuditPurgeResponse, Error, number | undefined>({
    mutationFn: async (daysToKeep) =>
      unwrapAdminResponse(await adminFetch<AdminApiResponse<SecurityAuditPurgeResponse>>(`${BASE_PATH}/events/purge`, {
        method: 'POST',
        body: JSON.stringify({ daysToKeep }),
      })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plugins', 'security-audit'] })
    },
  })
}
