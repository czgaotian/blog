import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../middleware', () => ({
  requireAuth: () => async (_c: any, next: any) => { await next() },
  requireRole: () => async (_c: any, next: any) => { await next() },
  AuthManager: {
    verifyPassword: vi.fn().mockResolvedValue(true),
    hashPassword: vi.fn().mockResolvedValue('new-hash'),
  },
}))

const mockUserRow = {
  id: 'u1', email: 'admin@test.com', username: 'admin',
  first_name: 'Admin', last_name: 'User',
  phone: null, bio: null, avatar_url: null,
  timezone: 'UTC', language: 'en', theme: 'dark',
  email_notifications: 1, two_factor_enabled: 0,
  role: 'admin', created_at: 1700000000000, last_login_at: null,
  password_hash: 'old-hash',
}

function makeMockDb() {
  const runCalls: string[] = []
  const db: any = {
    prepare: (sql: string) => ({
      bind: (..._args: any[]) => ({
        first: async () => {
          if (sql.includes('SELECT password_hash')) return { password_hash: 'old-hash' }
          if (sql.includes('SELECT id FROM users WHERE email')) return null
          if (sql.includes('SELECT id FROM users WHERE username')) return null
          if (sql.includes('SELECT id FROM users WHERE id')) return { id: 'u1' }
          return mockUserRow
        },
        run: async () => { runCalls.push(sql); return {} },
        all: async () => ({ results: [] }),
      }),
    }),
  }
  return { db, runCalls }
}

import { adminApiProfileRoutes } from './admin-api-profile'

function createApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', { userId: 'u1', email: 'admin@test.com', role: 'admin', exp: 0, iat: 0 })
    await next()
  })
  app.route('/admin/api/profile', adminApiProfileRoutes)
  return app
}

const baseEnv = { DB: makeMockDb().db, CACHE_KV: { delete: async () => {} } }

describe('GET /admin/api/profile', () => {
  it('returns profile data', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/profile', {}, baseEnv)
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json.email).toBe('admin@test.com')
    expect(json.firstName).toBe('Admin')
    expect(json.lastName).toBe('User')
    expect(json.timezone).toBe('UTC')
    expect(json).toHaveProperty('createdAt')
  })

  it('returns 401 when unauthenticated', async () => {
    const app = new Hono()
    app.route('/admin/api/profile', adminApiProfileRoutes)
    const res = await app.request('/admin/api/profile', {}, baseEnv)
    expect(res.status).toBe(401)
  })
})

describe('PUT /admin/api/profile', () => {
  it('updates profile and returns 200', async () => {
    const { db, runCalls } = makeMockDb()
    const app = createApp()
    const res = await app.request('/admin/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'New', lastName: 'Name', username: 'newuser', email: 'new@test.com' }),
    }, { ...baseEnv, DB: db })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json.message).toBe('Profile updated successfully')
    expect(runCalls.some(s => s.includes('UPDATE users SET'))).toBe(true)
  })

  it('returns 422 on validation failure', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: '' }),
    }, baseEnv)
    expect(res.status).toBe(422)
  })

  it('returns 409 when email already in use', async () => {
    const dupeDb: any = {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => {
            if (sql.includes('SELECT id FROM users WHERE id')) return { id: 'u1' }
            if (sql.includes('SELECT id FROM users WHERE email')) return { id: 'other' }
            return null
          },
          run: async () => ({}),
        }),
      }),
    }
    const app = createApp()
    const res = await app.request('/admin/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'A', lastName: 'B', username: 'ab', email: 'taken@test.com' }),
    }, { ...baseEnv, DB: dupeDb })
    expect(res.status).toBe(409)
  })
})

describe('POST /admin/api/profile/password', () => {
  it('changes password successfully', async () => {
    const { db, runCalls } = makeMockDb()
    const app = createApp()
    const res = await app.request('/admin/api/profile/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'oldpass', newPassword: 'newpassword1', confirmPassword: 'newpassword1' }),
    }, { ...baseEnv, DB: db })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json.message).toBe('Password changed successfully')
    expect(runCalls.some(s => s.includes('UPDATE users SET password_hash'))).toBe(true)
  })

  it('returns 422 when passwords do not match', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/profile/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'old', newPassword: 'newpass12', confirmPassword: 'different1' }),
    }, baseEnv)
    expect(res.status).toBe(422)
  })

  it('returns 400 when current password is wrong', async () => {
    const middleware = await import('../middleware')
    vi.mocked((middleware as any).AuthManager.verifyPassword).mockResolvedValueOnce(false)
    const app = createApp()
    const res = await app.request('/admin/api/profile/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'wrong', newPassword: 'newpass12', confirmPassword: 'newpass12' }),
    }, baseEnv)
    expect(res.status).toBe(400)
  })
})

describe('POST /admin/api/profile/avatar', () => {
  it('updates avatar URL and returns 200', async () => {
    const { db, runCalls } = makeMockDb()
    const app = createApp()
    const fd = new FormData()
    fd.append('avatar', new File(['img'], 'photo.jpg', { type: 'image/jpeg' }))
    const res = await app.request('/admin/api/profile/avatar', { method: 'POST', body: fd }, { ...baseEnv, DB: db })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('avatarUrl')
    expect(json.avatarUrl).toContain('/uploads/avatars/')
    expect(runCalls.some(s => s.includes('UPDATE users SET avatar_url'))).toBe(true)
  })

  it('returns 400 for non-image file', async () => {
    const app = createApp()
    const fd = new FormData()
    fd.append('avatar', new File(['data'], 'file.txt', { type: 'text/plain' }))
    const res = await app.request('/admin/api/profile/avatar', { method: 'POST', body: fd }, baseEnv)
    expect(res.status).toBe(400)
  })

  it('returns 400 when no file provided', async () => {
    const app = createApp()
    const fd = new FormData()
    const res = await app.request('/admin/api/profile/avatar', { method: 'POST', body: fd }, baseEnv)
    expect(res.status).toBe(400)
  })
})
