import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { requestLoggingMiddleware } from './request-logging'
import type { Bindings, Variables } from '../app'

describe('requestLoggingMiddleware', () => {
  it('does nothing by default', async () => {
    const logger = { logRequest: vi.fn() }
    const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

    app.use('*', requestLoggingMiddleware({
      loggerFactory: () => logger as any,
    }))
    app.get('/content/123', (c) => c.json({ ok: true }))

    const res = await app.request('/content/123', {}, { DB: {} })

    expect(res.status).toBe(200)
    expect(logger.logRequest).not.toHaveBeenCalled()
  })

  it('logs sanitized request context when enabled', async () => {
    const logger = { logRequest: vi.fn().mockResolvedValue(undefined) }
    const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

    app.use('*', async (c, next) => {
      c.set('requestId', 'req-1')
      c.set('startTime', Date.now() - 25)
      c.set('user', { userId: 'user-1', email: 'a@test.com', role: 'admin', exp: 0, iat: 0 })
      await next()
    })
    app.use('*', requestLoggingMiddleware({
      enabled: true,
      loggerFactory: () => logger as any,
    }))
    app.get('/content/123', (c) => c.json({ ok: true }))

    const res = await app.request('/content/123', {}, { DB: {} })

    expect(res.status).toBe(200)
    expect(logger.logRequest).toHaveBeenCalledWith(
      'GET',
      '/content/:id',
      200,
      expect.any(Number),
      {
        requestId: 'req-1',
        userId: 'user-1',
        source: 'request-logging-middleware',
      },
    )
  })

  it('supports per-request enabled config', async () => {
    const logger = { logRequest: vi.fn().mockResolvedValue(undefined) }
    const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

    app.use('*', requestLoggingMiddleware({
      enabled: (env) => env.REQUEST_LOGGING_ENABLED === 'true',
      loggerFactory: () => logger as any,
    }))
    app.get('/test', (c) => c.json({ ok: true }))

    const disabledRes = await app.request('/test', {}, { DB: {}, REQUEST_LOGGING_ENABLED: 'false' })
    const enabledRes = await app.request('/test', {}, { DB: {}, REQUEST_LOGGING_ENABLED: 'true' })

    expect(disabledRes.status).toBe(200)
    expect(enabledRes.status).toBe(200)
    expect(logger.logRequest).toHaveBeenCalledTimes(1)
  })

  it('uses waitUntil when available', async () => {
    const logger = { logRequest: vi.fn().mockResolvedValue(undefined) }
    const waitUntil = vi.fn()
    const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

    app.use('*', requestLoggingMiddleware({
      enabled: true,
      loggerFactory: () => logger as any,
    }))
    app.get('/test', (c) => c.json({ ok: true }))

    const res = await app.request('/test', {}, { DB: {} }, { waitUntil } as any)

    expect(res.status).toBe(200)
    expect(waitUntil).toHaveBeenCalledWith(expect.any(Promise))
  })
})
