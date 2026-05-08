import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware'
import { buildRouteList, getAppInstance } from '../services/route-metadata'
import { getCoreVersion } from '../utils/version'
import type { ApiReferenceResponse } from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../app'

export const adminApiRoutesRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminApiRoutesRoutes.use('*', requireAuth())
adminApiRoutesRoutes.use('*', requireRole(['admin', 'editor']))

adminApiRoutesRoutes.get('/', (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Authentication required' }, 401)

  const endpoints = buildRouteList(getAppInstance())
  const response: ApiReferenceResponse = {
    endpoints,
    version: getCoreVersion(),
  }
  return c.json(response)
})
