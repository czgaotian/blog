import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../middleware', () => ({
  requireAuth: () => async (_c: any, next: any) => { await next() },
  requireRole: () => async (_c: any, next: any) => { await next() },
}))

const mockGeneralSettings = {
  siteName: 'Test Blog',
  siteDescription: 'A test blog',
  adminEmail: 'admin@test.com',
  timezone: 'UTC',
  language: 'en',
  maintenanceMode: false,
}
const mockSecuritySettings = {
  jwtExpiresIn: '7d',
  jwtRefreshGraceSeconds: 300,
}

vi.mock('../services/settings', () => ({
  SettingsService: class {
    async getGeneralSettings() { return mockGeneralSettings }
    async getSecuritySettings() { return mockSecuritySettings }
    async saveGeneralSettings() { return true }
    async saveSecuritySettings() { return true }
  },
}))

import { adminApiSettingsRoutes } from './admin-api-settings'

function createApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', { userId: 'u1', email: 'admin@test.com', role: 'admin', exp: 0, iat: 0 })
    await next()
  })
  app.route('/api/admin/settings', adminApiSettingsRoutes)
  return app
}

describe('GET /api/admin/settings', () => {
  it('returns general and security settings', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/settings', {}, { DB: {} })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('general')
    expect(json).toHaveProperty('security')
    expect(json.general.siteName).toBe('Test Blog')
    expect(json.security.jwtExpiresIn).toBe('7d')
  })

  it('returns 401 when unauthenticated', async () => {
    const app = new Hono()
    app.route('/api/admin/settings', adminApiSettingsRoutes)
    const res = await app.request('/api/admin/settings', {}, { DB: {} })
    expect(res.status).toBe(401)
  })
})

describe('PUT /api/admin/settings/general', () => {
  it('saves valid general settings', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/settings/general', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...mockGeneralSettings }),
    }, { DB: {} })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json.message).toMatch(/saved/i)
  })

  it('returns 422 for invalid body', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/settings/general', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteName: '' }),
    }, { DB: {} })
    expect(res.status).toBe(422)
  })
})

describe('PUT /api/admin/settings/security', () => {
  it('saves valid security settings', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/settings/security', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jwtExpiresIn: '30d', jwtRefreshGraceSeconds: 600 }),
    }, { DB: {} })
    expect(res.status).toBe(200)
  })

  it('returns 422 for invalid jwtExpiresIn', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/settings/security', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jwtExpiresIn: 'not-valid!', jwtRefreshGraceSeconds: 0 }),
    }, { DB: {} })
    expect(res.status).toBe(422)
  })
})
