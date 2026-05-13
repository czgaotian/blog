import { useQuery } from '@tanstack/react-query'
import type { LogsListResponse, LogDetailsResponse, LogConfigResponse } from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export interface LogsFilters {
  page?: number
  limit?: number
  level?: string
  category?: string
  search?: string
  source?: string
  start_date?: string
  end_date?: string
}

export function useLogsList(filters: LogsFilters = {}) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.level) params.set('level', filters.level)
  if (filters.category) params.set('category', filters.category)
  if (filters.search) params.set('search', filters.search)
  if (filters.source) params.set('source', filters.source)
  if (filters.start_date) params.set('start_date', filters.start_date)
  if (filters.end_date) params.set('end_date', filters.end_date)
  const qs = params.toString()

  return useQuery<LogsListResponse>({
    queryKey: ['admin', 'logs', filters],
    queryFn: () => adminFetch<LogsListResponse>(`/api/admin/logs${qs ? `?${qs}` : ''}`),
  })
}

export function useLogDetails(id: string) {
  return useQuery<LogDetailsResponse>({
    queryKey: ['admin', 'logs', id],
    queryFn: () => adminFetch<LogDetailsResponse>(`/api/admin/logs/${id}`),
    enabled: Boolean(id),
  })
}

export function useLogConfig() {
  return useQuery<LogConfigResponse>({
    queryKey: ['admin', 'logs', 'config'],
    queryFn: () => adminFetch<LogConfigResponse>('/api/admin/logs/config'),
  })
}
