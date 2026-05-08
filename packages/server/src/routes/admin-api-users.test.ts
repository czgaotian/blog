import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../middleware', () => ({
  requireAuth: () => async (_c: any, next: any) => { await next() },
  requireRole: () => async (_c: any, next: any) => { await next() },
}))

const mockUser = {
  id: 'u1',
  email: 'admin@test.com',
  username: 'admin',
  first_name: 'Admin',
  last_name: 'User',
  role: 'admin',
  is_active: 1,
  created_at: 1700000000000,
  last_login_at: null,
}

const mockDb: any = {
  prepare: (sql: string) => ({
    bind: (..._args: any[]) => ({
      first: async () => {
        if (sql.includes('COUNT(*)')) return { count: 1 }
        if (sql.includes('SELECT id FROM users WHERE email')) return null
        if (sql.includes('SELECT id FROM users WHERE id')) return { id: 'u1' }
        return mockUser
      },
      all: async () => ({ results: [mockUser] }),
      run: async () => ({}),
    }),
    first: async () => {
      if (sql.includes('COUNT(*)')) return { count: 1 }
      return mockUser
    },
    all: async () => ({ results: [mockUser] }),
    run: async () => ({}),
  }),
}

import { adminApiUsersRoutes } from './admin-api-users'

function createApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', { userId: 'u99', email: 'admin@test.com', role: 'admin', exp: 0, iat: 0 })
    await next()
  })
  app.route('/admin/api/users', adminApiUsersRoutes)
  return app
}

describe('GET /admin/api/users', () => {
  it('returns users list', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/users', {}, { DB: mockDb })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('users')
    expect(json).toHaveProperty('total')
    expect(json).toHaveProperty('page')
    expect(json).toHaveProperty('limit')
    expect(json.users).toHaveLength(1)
    expect(json.users[0].email).toBe('admin@test.com')
  })

  it('returns 401 when unauthenticated', async () => {
    const app = new Hono()
    app.route('/admin/api/users', adminApiUsersRoutes)
    const res = await app.request('/admin/api/users', {}, { DB: mockDb })
    expect(res.status).toBe(401)
  })
})

describe('GET /admin/api/users/:id', () => {
  it('returns single user', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/users/u1', {}, { DB: mockDb })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('user')
    expect(json.user.email).toBe('admin@test.com')
  })
})

describe('PATCH /admin/api/users/:id', () => {
  it('updates user fields', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/users/u1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'editor' }),
    }, { DB: mockDb })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json.message).toMatch(/updated/i)
  })

  it('returns 422 for invalid role', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/users/u1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'superadmin' }),
    }, { DB: mockDb })
    expect(res.status).toBe(422)
  })
})

describe('DELETE /admin/api/users/:id', () => {
  it('prevents deleting own account', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/users/u99', {
      method: 'DELETE',
    }, { DB: mockDb })
    expect(res.status).toBe(400)
    const json = await res.json() as any
    expect(json.error).toMatch(/own account/i)
  })
})

const mockActivityLog = {
  id: 'log1', user_id: 'u1', action: 'content.create',
  resource_type: 'content', resource_id: 'c1',
  details: JSON.stringify({ title: 'Test' }),
  ip_address: '127.0.0.1', user_agent: 'Mozilla',
  created_at: 1700000000000,
  user_email: 'admin@test.com', user_name: 'Admin User',
}

describe('GET /admin/api/users/activity-logs', () => {
  it('returns activity logs list', async () => {
    const db: any = {
      prepare: (sql: string) => ({
        bind: (..._args: any[]) => ({
          first: async () => {
            if (sql.includes('COUNT(*)')) return { count: 1 }
            return null
          },
          all: async () => ({ results: [mockActivityLog] }),
          run: async () => ({}),
        }),
      }),
    }
    const app = new Hono()
    app.use('*', async (c, next) => {
      c.set('user', { userId: 'u1', email: 'admin@test.com', role: 'admin', exp: 0, iat: 0 })
      await next()
    })
    app.route('/admin/api/users', adminApiUsersRoutes)
    const res = await app.request('/admin/api/users/activity-logs', {}, { DB: db })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('logs')
    expect(json).toHaveProperty('pagination')
    expect(json.logs[0].action).toBe('content.create')
    expect(json.logs[0].userId).toBe('u1')
    expect(json.pagination).toHaveProperty('total', 1)
  })

  it('returns 400 for invalid date_from', async () => {
    const db: any = { prepare: () => ({ bind: () => ({ first: async () => null, all: async () => ({ results: [] }) }) }) }
    const app = new Hono()
    app.use('*', async (c, next) => {
      c.set('user', { userId: 'u1', email: 'admin@test.com', role: 'admin', exp: 0, iat: 0 })
      await next()
    })
    app.route('/admin/api/users', adminApiUsersRoutes)
    const res = await app.request('/admin/api/users/activity-logs?date_from=not-a-date', {}, { DB: db })
    expect(res.status).toBe(400)
  })
})

describe('GET /admin/api/users/activity-logs/export', () => {
  it('returns CSV with correct content-type', async () => {
    const db: any = {
      prepare: () => ({
        bind: (..._args: any[]) => ({
          all: async () => ({ results: [mockActivityLog] }),
        }),
      }),
    }
    const app = new Hono()
    app.use('*', async (c, next) => {
      c.set('user', { userId: 'u1', email: 'admin@test.com', role: 'admin', exp: 0, iat: 0 })
      await next()
    })
    app.route('/admin/api/users', adminApiUsersRoutes)
    const res = await app.request('/admin/api/users/activity-logs/export', {}, { DB: db })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
    const text = await res.text()
    expect(text).toContain('Timestamp')
    expect(text).toContain('content.create')
  })
})
