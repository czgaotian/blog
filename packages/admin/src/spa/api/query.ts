import type { AdminMeResponse } from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export const adminApi = {
  me: () => adminFetch<AdminMeResponse>('/api/admin/me'),
}
