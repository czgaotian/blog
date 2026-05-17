import { useQuery } from '@tanstack/react-query'
import type { ApiReferenceResponse } from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export function useApiReference() {
  return useQuery<ApiReferenceResponse>({
    queryKey: ['admin', 'api-reference'],
    queryFn: () => adminFetch<ApiReferenceResponse>('/api/admin/api-reference'),
  })
}
