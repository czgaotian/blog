import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AdminApiResponse, StripeAdminDashboardData, StripeSyncResponse } from '@worker-blog/shared/admin-api'
import { AdminApiError, adminFetch } from './client'

const BASE_PATH = '/api/plugins/stripe'

function unwrapAdminResponse<T>(response: AdminApiResponse<T>): T {
  if (!response.success) {
    throw new AdminApiError(response.error, 500, response)
  }

  return response.data
}

export function useStripeAdmin() {
  return useQuery<StripeAdminDashboardData>({
    queryKey: ['plugins', 'stripe'],
    queryFn: async () => unwrapAdminResponse(await adminFetch<AdminApiResponse<StripeAdminDashboardData>>(BASE_PATH)),
  })
}

export function useSyncStripeSubscriptions() {
  const qc = useQueryClient()

  return useMutation<StripeSyncResponse, Error>({
    mutationFn: async () =>
      unwrapAdminResponse(await adminFetch<AdminApiResponse<StripeSyncResponse>>(`${BASE_PATH}/sync`, {
        method: 'POST',
      })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plugins', 'stripe'] })
    },
  })
}
