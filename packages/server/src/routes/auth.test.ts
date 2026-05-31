import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import authRoutes, { getCurrentSession } from './auth'
import { getCustomData } from '../features/user-profiles'

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
