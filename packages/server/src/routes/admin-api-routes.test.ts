import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../middleware', () => ({
  requireAuth: () => async (_c: any, next: any) => { await next() },
  requireRole: () => async (_c: any, next: any) => { await next() },
}))

vi.mock('../services/route-metadata', () => ({
  buildRouteList: () => [
    { method: 'GET', path: '/api/health', description: 'Health check', authentication: false, category: 'system', documented: true },
    { method: 'POST', path: '/api/content', description: 'Create content', authentication: true, category: 'content', documented: true },
  ],
  getAppInstance: () => ({}),
}))

vi.mock('../utils/version', () => ({ getCoreVersion: () => '1.2.3' }))

import { adminApiRoutesRoutes } from './admin-api-routes'

function createApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', { userId: 'u1', email: 'a@example.com', role: 'admin', exp: 0, iat: 0 })
    await next()
  })
  app.route('/api/admin/api-reference', adminApiRoutesRoutes)
  return app
}

describe('GET /api/admin/api-reference', () => {
  it('returns endpoints and version', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/api-reference')
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('endpoints')
    expect(json).toHaveProperty('version')
    expect(json.version).toBe('1.2.3')
    expect(json.endpoints).toHaveLength(2)
    expect(json.endpoints[0].method).toBe('GET')
    expect(json.endpoints[0].path).toBe('/api/health')
  })

  it('returns 401 when unauthenticated', async () => {
    const app = new Hono()
    app.route('/api/admin/api-reference', adminApiRoutesRoutes)
    const res = await app.request('/api/admin/api-reference')
    expect(res.status).toBe(401)
  })
})
