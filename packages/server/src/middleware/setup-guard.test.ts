import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SETUP_REQUIRED_CODE } from '@worker-blog/shared/admin-api'
import { setupGuardMiddleware } from './setup-guard'
import { resetAdminExistsCache } from '../services/auth-validation'

function createDb(adminExists: boolean) {
  const first = vi.fn().mockResolvedValue(adminExists ? { id: 'admin-1' } : null)
  const bind = vi.fn(() => ({ first }))
  const prepare = vi.fn(() => ({ bind }))

  return {
    db: { prepare },
    prepare,
    bind,
    first,
  }
}

function createApp(adminExists: boolean) {
  const app = new Hono()
  app.use('/api/*', setupGuardMiddleware() as any)
  app.get('/api/protected', (c) => c.json({ ok: true }))
  app.get('/api/health', (c) => c.json({ status: 'healthy' }))
  app.post('/api/auth/register', (c) => c.json({ ok: true }, 201))

  return {
    app,
    env: { DB: createDb(adminExists).db },
  }
}

describe('setupGuardMiddleware', () => {
  beforeEach(() => {
    resetAdminExistsCache()
  })

  it('returns setup required for normal API requests when no admin exists', async () => {
    const { app, env } = createApp(false)

    const res = await app.request('/api/protected', {}, env)
    const json = await res.json() as { error: string; code: string }

    expect(res.status).toBe(428)
    expect(json).toEqual({
      error: 'Initial admin account is required',
      code: SETUP_REQUIRED_CODE,
    })
  })

  it('allows the first admin registration route before setup is complete', async () => {
    const { app, env } = createApp(false)

    const res = await app.request('/api/auth/register', { method: 'POST' }, env)
    const json = await res.json() as { ok: boolean }

    expect(res.status).toBe(201)
    expect(json.ok).toBe(true)
  })

  it('allows the health route before setup is complete', async () => {
    const { app, env } = createApp(false)

    const res = await app.request('/api/health', {}, env)
    const json = await res.json() as { status: string }

    expect(res.status).toBe(200)
    expect(json.status).toBe('healthy')
  })

  it('allows normal API requests once an admin exists', async () => {
    const { app, env } = createApp(true)

    const res = await app.request('/api/protected', {}, env)
    const json = await res.json() as { ok: boolean }

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
  })
})
