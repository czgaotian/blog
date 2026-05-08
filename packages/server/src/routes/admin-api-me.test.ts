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

  app.use('/admin/api/*', async (c, next) => {
    c.set('user', {
      userId: 'user-1',
      email: 'admin@example.com',
      role: 'admin',
      exp: 123,
      iat: 100,
    })
    c.set('appVersion', '9.8.7')
    c.set('pluginMenuItems', [
      { label: 'Cache', path: '/admin/cache', icon: '<svg></svg>' },
    ])
    await next()
  })

  app.route('/admin/api', adminApiRoutes)
  return app
}

describe('GET /admin/api/me', () => {
  it('returns the current admin session and bootstrap metadata', async () => {
    const app = createApp()

    const res = await app.request('/admin/api/me')
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
        name: 'Worker Blog',
        version: '9.8.7',
      },
      pluginMenu: [
        { label: 'Cache', path: '/admin/cache', icon: '<svg></svg>' },
      ],
    })
  })
})
