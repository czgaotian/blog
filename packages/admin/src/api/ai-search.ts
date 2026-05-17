import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AdminApiResponse,
  AISearchAdminDashboardData,
  AISearchSettingsData,
  TriggerAISearchIndexRequest,
  TriggerAISearchIndexResponse,
  UpdateAISearchSettingsRequest,
} from '@worker-blog/shared/admin-api'
import { AdminApiError, adminFetch } from './client'

const BASE_PATH = '/api/plugins/ai-search'

function unwrapAdminResponse<T>(response: AdminApiResponse<T>): T {
  if (!response.success) {
    throw new AdminApiError(response.error, 500, response)
  }

  return response.data
}

export function useAISearchAdmin() {
  return useQuery<AISearchAdminDashboardData>({
    queryKey: ['plugins', 'ai-search'],
    queryFn: async () => unwrapAdminResponse(await adminFetch<AdminApiResponse<AISearchAdminDashboardData>>(BASE_PATH)),
  })
}

export function useUpdateAISearchSettings() {
  const qc = useQueryClient()

  return useMutation<AISearchSettingsData, Error, UpdateAISearchSettingsRequest>({
    mutationFn: async (data) =>
      unwrapAdminResponse(await adminFetch<AdminApiResponse<AISearchSettingsData>>(`${BASE_PATH}/settings`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plugins', 'ai-search'] })
    },
  })
}

export function useTriggerAISearchIndex() {
  const qc = useQueryClient()

  return useMutation<TriggerAISearchIndexResponse, Error, TriggerAISearchIndexRequest>({
    mutationFn: async (data) =>
      unwrapAdminResponse(await adminFetch<AdminApiResponse<TriggerAISearchIndexResponse>>(`${BASE_PATH}/index`, {
        method: 'POST',
        body: JSON.stringify(data),
      })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plugins', 'ai-search'] })
    },
  })
}
