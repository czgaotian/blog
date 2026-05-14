import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../middleware', () => ({
  requireAuth: () => async (_c: any, next: any) => {
    await next()
  },
  requireRole: () => async (_c: any, next: any) => {
    await next()
  },
}))

import { adminApiRoutes } from './admin-api'

function createApp() {
  const app = new Hono()

  app.use('/api/admin/*', async (c, next) => {
    c.set('user', {
      userId: 'user-1',
      email: 'admin@example.com',
      role: 'admin',
      exp: 123,
      iat: 100,
    })
    c.set('appVersion', '9.8.7')
    c.set('appName', 'Custom Admin')
    await next()
  })

  app.route('/api/admin', adminApiRoutes)
  return app
}

describe('GET /api/admin/me', () => {
  it('returns the current admin session and bootstrap metadata', async () => {
    const app = createApp()

    const res = await app.request('/api/admin/me')
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        role: 'admin',
      },
      permissions: ['admin'],
      app: {
        name: 'Custom Admin',
        version: '9.8.7',
      },
    })
  })
})
