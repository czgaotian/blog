import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import authRoutes, { getCurrentSession } from './auth'
import { getCustomData } from '../features/user-profiles'
import { setupGuardMiddleware } from '../middleware/setup-guard'
import { resetAdminExistsCache } from '../services/auth-validation'

vi.mock('../middleware', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../middleware')>()
  return {
    ...actual,
    requireAuth: () => async (c: any, next: any) => {
      c.set('user', {
        userId: 'u1',
        email: 'admin@example.com',
        role: 'admin',
        exp: 0,
        iat: 0,
      })
      await next()
    },
  }
})

vi.mock('../features/user-profiles', () => ({
  getCustomData: vi.fn(),
}))

const userRow = {
  id: 'u1',
  email: 'admin@example.com',
  username: 'admin',
  first_name: 'Admin',
  last_name: 'User',
  role: 'admin',
  created_at: '2026-01-01T00:00:00.000Z',
}

function createDb(firstResult: unknown = userRow) {
  const first = vi.fn().mockResolvedValue(firstResult)
  const bind = vi.fn(() => ({ first }))
  const prepare = vi.fn(() => ({ bind }))

  return {
    db: { prepare },
    prepare,
    bind,
    first,
  }
}

function createSessionApp(db: unknown, user?: unknown) {
  const app = new Hono()

  app.use('*', async (c, next) => {
    if (user !== undefined) {
      c.set('user', user)
    }
    await next()
  })
  app.get('/session', getCurrentSession)

  return { app, env: { DB: db } }
}

describe('auth session routes', () => {
  beforeEach(() => {
    resetAdminExistsCache()
    vi.mocked(getCustomData).mockResolvedValue({ display_name: 'Admin User' })
  })

  it('returns the current authenticated session user from /session', async () => {
    const app = new Hono()
    app.route('/api/auth', authRoutes)
    const { db, prepare, bind } = createDb()

    const res = await app.request('/api/auth/session', {}, { DB: db })
    const json = await res.json() as { user: { id: string; email: string; role: string; display_name: string } }

    expect(res.status).toBe(200)
    expect(prepare).toHaveBeenCalledWith('SELECT id, email, username, first_name, last_name, role, created_at FROM users WHERE id = ?')
    expect(bind).toHaveBeenCalledWith('u1')
    expect(json.user).toMatchObject({
      id: 'u1',
      email: 'admin@example.com',
      role: 'admin',
      display_name: 'Admin User',
    })
  })

  it('keeps /me as a legacy alias for the current session', async () => {
    const app = new Hono()
    app.route('/api/auth', authRoutes)
    const { db } = createDb()

    const res = await app.request('/api/auth/me', {}, { DB: db })
    const json = await res.json() as { user: { id: string } }

    expect(res.status).toBe(200)
    expect(json.user.id).toBe('u1')
  })

  it('returns 401 when the session handler has no authenticated user', async () => {
    const { db } = createDb()
    const { app, env } = createSessionApp(db)

    const res = await app.request('/session', {}, env)
    const json = await res.json() as { error: string }

    expect(res.status).toBe(401)
    expect(json.error).toBe('Not authenticated')
  })

  it('returns 404 when the authenticated user no longer exists', async () => {
    const { db } = createDb(null)
    const { app, env } = createSessionApp(db, {
      userId: 'missing-user',
      email: 'missing@example.com',
      role: 'admin',
      exp: 0,
      iat: 0,
    })

    const res = await app.request('/session', {}, env)
    const json = await res.json() as { error: string }

    expect(res.status).toBe(404)
    expect(json.error).toBe('User not found')
  })

  it('returns 500 when session lookup fails', async () => {
    const prepare = vi.fn(() => {
      throw new Error('db unavailable')
    })
    const { app, env } = createSessionApp({ prepare }, {
      userId: 'u1',
      email: 'admin@example.com',
      role: 'admin',
      exp: 0,
      iat: 0,
    })

    const res = await app.request('/session', {}, env)
    const json = await res.json() as { error: string }

    expect(res.status).toBe(500)
    expect(json.error).toBe('Failed to get session')
  })
})

describe('first admin registration', () => {
  beforeEach(() => {
    resetAdminExistsCache()
  })

  it('creates the first admin account when the users table is empty', async () => {
    const countFirst = vi.fn().mockResolvedValue({ count: 0 })
    const insertRun = vi.fn().mockResolvedValue({ success: true })
    const insertBind = vi.fn(() => ({ run: insertRun }))
    const prepare = vi.fn((query: string) => {
      if (query.includes('SELECT COUNT(*) as count FROM users')) {
        return { first: countFirst }
      }
      if (query.includes('INSERT INTO users')) {
        return { bind: insertBind }
      }
      throw new Error(`Unexpected query: ${query}`)
    })
    const app = new Hono()
    app.route('/api/auth', authRoutes)

    const res = await app.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'ADMIN@Example.com',
        username: 'admin_user',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
      }),
      headers: { 'Content-Type': 'application/json' },
    }, {
      DB: { prepare },
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '1h',
      ENVIRONMENT: 'development',
    })
    const json = await res.json() as { user: { email: string; username: string; firstName: string; lastName: string; role: string }; token: string }

    expect(res.status).toBe(201)
    expect(json.user).toMatchObject({
      email: 'admin@example.com',
      username: 'admin_user',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    })
    expect(json.token).toBeTruthy()
    expect(insertRun).toHaveBeenCalled()
    expect(insertBind).toHaveBeenCalledWith(
      expect.any(String),
      'admin@example.com',
      'admin_user',
      'Admin',
      'User',
      expect.any(String),
      'admin',
      1,
      expect.any(Number),
      expect.any(Number),
    )
  })

  it('rejects invalid registration payloads with shared schema details', async () => {
    const prepare = vi.fn((query: string) => {
      if (query.includes('SELECT COUNT(*) as count FROM users')) {
        return { first: vi.fn().mockResolvedValue({ count: 0 }) }
      }
      throw new Error(`Unexpected query: ${query}`)
    })
    const app = new Hono()
    app.route('/api/auth', authRoutes)

    const res = await app.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'not-an-email',
        username: 'a!',
        password: 'short',
        firstName: '',
        lastName: '',
      }),
      headers: { 'Content-Type': 'application/json' },
    }, {
      DB: { prepare },
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '1h',
    })
    const json = await res.json() as { error: string; details: Array<{ message: string; path: string[] }> }

    expect(res.status).toBe(400)
    expect(json.error).toBe('Validation failed')
    expect(json.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: 'Enter a valid email address', path: ['email'] }),
      expect.objectContaining({ message: 'Username must be at least 3 characters', path: ['username'] }),
      expect.objectContaining({ message: 'First name is required', path: ['firstName'] }),
      expect.objectContaining({ message: 'Last name is required', path: ['lastName'] }),
      expect.objectContaining({ message: 'Password must be at least 8 characters', path: ['password'] }),
    ]))
  })

  it('rejects registration after any user exists', async () => {
    const prepare = vi.fn(() => ({
      first: vi.fn().mockResolvedValue({ count: 1 }),
    }))
    const app = new Hono()
    app.route('/api/auth', authRoutes)

    const res = await app.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@example.com',
        username: 'admin_user',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
      }),
      headers: { 'Content-Type': 'application/json' },
    }, {
      DB: { prepare },
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '1h',
    })
    const json = await res.json() as { error: string }

    expect(res.status).toBe(403)
    expect(json.error).toBe('Registration is only available before the first admin account is created')
  })

  it('marks setup complete after successful first admin registration', async () => {
    const countFirst = vi.fn().mockResolvedValue({ count: 0 })
    const prepare = vi.fn((query: string) => {
      if (query.includes('SELECT COUNT(*) as count FROM users')) {
        return { first: countFirst }
      }
      if (query.includes('INSERT INTO users')) {
        return { bind: vi.fn(() => ({ run: vi.fn().mockResolvedValue({ success: true }) })) }
      }
      throw new Error(`Unexpected query: ${query}`)
    })
    const authApp = new Hono()
    authApp.route('/api/auth', authRoutes)

    const registerRes = await authApp.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@example.com',
        username: 'admin_user',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
      }),
      headers: { 'Content-Type': 'application/json' },
    }, {
      DB: { prepare },
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '1h',
    })

    const guardedApp = new Hono()
    guardedApp.use('/api/*', setupGuardMiddleware() as any)
    guardedApp.get('/api/protected', (c) => c.json({ ok: true }))
    const guardedRes = await guardedApp.request('/api/protected', {}, {
      DB: {
        prepare: vi.fn(() => {
          throw new Error('setup guard should use the refreshed cache')
        }),
      },
    })

    expect(registerRes.status).toBe(201)
    expect(guardedRes.status).toBe(200)
  })
})
