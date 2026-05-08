import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../middleware', () => ({
  requireAuth: () => async (_c: any, next: any) => { await next() },
  requireRole: () => async (_c: any, next: any) => { await next() },
}))

const mockLog = {
  id: 'log-1', level: 'info', category: 'api', message: 'Test log',
  source: null, userId: null, ipAddress: null, method: 'GET', url: '/test',
  statusCode: 200, duration: 50, stackTrace: null, data: null, tags: null,
  createdAt: new Date('2026-01-01'),
}

vi.mock('../services', () => ({
  getLogger: () => ({
    getLogs: async (_filter: any) => {
      if (_filter?.limit === 50 && _filter?.offset === 0) {
        return { logs: [mockLog], total: 1 }
      }
      return { logs: [], total: 0 }
    },
    getAllConfigs: async () => [
      { id: 'c1', category: 'api', enabled: true, level: 'info', retention: 30, maxSize: 10000, createdAt: new Date(), updatedAt: new Date() },
    ],
  }),
}))

import { adminApiLogsRoutes } from './admin-api-logs'

function createApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', { userId: 'u1', email: 'a@example.com', role: 'admin', exp: 0, iat: 0 })
    await next()
  })
  app.route('/admin/api/logs', adminApiLogsRoutes)
  return app
}

describe('GET /admin/api/logs', () => {
  it('returns paginated logs list', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/logs')
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('logs')
    expect(json).toHaveProperty('pagination')
    expect(json).toHaveProperty('filters')
    expect(json.logs).toHaveLength(1)
    expect(json.logs[0].id).toBe('log-1')
    expect(json.pagination.totalItems).toBe(1)
    expect(json.pagination.currentPage).toBe(1)
  })

  it('returns 401 when unauthenticated', async () => {
    const app = new Hono()
    app.route('/admin/api/logs', adminApiLogsRoutes)
    const res = await app.request('/admin/api/logs')
    expect(res.status).toBe(401)
  })
})

describe('GET /admin/api/logs/config', () => {
  it('returns log configs', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/logs/config')
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('configs')
    expect(json.configs).toHaveLength(1)
    expect(json.configs[0].category).toBe('api')
    expect(json.configs[0].enabled).toBe(true)
  })
})

describe('GET /admin/api/logs/:id', () => {
  it('returns single log', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/logs/log-1')
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('log')
    expect(json.log.id).toBe('log-1')
    expect(json.log.level).toBe('info')
    expect(json.log.tags).toEqual([])
  })

  it('returns 404 for unknown id', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/logs/not-found')
    expect(res.status).toBe(404)
  })
})
