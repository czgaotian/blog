import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../middleware', () => ({
  requireAuth: () => async (_c: any, next: any) => { await next() },
  requireRole: () => async (_c: any, next: any) => { await next() },
}))

vi.mock('@worker-blog/shared/utils/metrics', () => ({
  metricsTracker: {
    getRequestsPerSecond: () => 1.5,
    getTotalRequests: () => 100,
    getAverageRPS: () => 1.2,
    getAverageDurationMs: () => 42.25,
    getStatusClassCounts: () => ({ '2xx': 98, '4xx': 2 }),
  },
}))

import { adminApiDashboardRoutes } from './admin-api-dashboard'

function createApp() {
  const app = new Hono()
  app.use('/api/admin/dashboard', async (c, next) => {
    c.set('user', { userId: 'u1', email: 'a@example.com', role: 'admin', exp: 0, iat: 0 })
    await next()
  })
  app.use('/api/admin/dashboard/*', async (c, next) => {
    c.set('user', { userId: 'u1', email: 'a@example.com', role: 'admin', exp: 0, iat: 0 })
    await next()
  })
  app.route('/api/admin/dashboard', adminApiDashboardRoutes)
  return app
}

describe('GET /api/admin/dashboard', () => {
  it('returns 200 with stats, recentActivity, and metrics shapes', async () => {
    const db = {
      prepare: (sql: string) => ({
        first: async () => {
          if (sql.includes('FROM contents')) return { count: 7 }
          if (sql.includes('media')) return { count: 5, total_size: 1024 }
          if (sql.includes('users')) return { count: 2 }
          return null
        },
        run: async () => ({ meta: { size_after: 2048 } }),
        all: async () => ({ results: [] }),
        bind: (..._args: any[]) => ({
          all: async () => ({ results: [] }),
        }),
      }),
    }

    const app = createApp()
    const res = await app.request('/api/admin/dashboard', {}, { DB: db })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('stats')
    expect(json).toHaveProperty('recentActivity')
    expect(json).toHaveProperty('metrics')
    expect(json.stats.contentItems).toBe(7)
    expect(json.stats.mediaFiles).toBe(5)
    expect(json.stats.mediaSize).toBe(1024)
    expect(json.stats.users).toBe(2)
    expect(json.metrics.requestsPerSecond).toBe(1.5)
    expect(json.metrics.totalRequests).toBe(100)
    expect(json.metrics.averageResponseMs).toBe(42.25)
    expect(json.metrics.statusClassCounts).toEqual({ '2xx': 98, '4xx': 2 })
    expect(json.recentActivity).toEqual([])
  })

  it('returns 401 when unauthenticated', async () => {
    const app = new Hono()
    app.route('/api/admin/dashboard', adminApiDashboardRoutes)
    const res = await app.request('/api/admin/dashboard')
    expect(res.status).toBe(401)
  })
})
