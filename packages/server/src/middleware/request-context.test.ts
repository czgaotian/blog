import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { requestContextMiddleware } from './request-context'
import type { Bindings, Variables } from '../app'

describe('requestContextMiddleware', () => {
  it('adds generated request context to the request and response', async () => {
    const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

    app.use('*', requestContextMiddleware())
    app.get('/test', (c) => c.json({
      requestId: c.get('requestId'),
      startTime: c.get('startTime'),
    }))

    const res = await app.request('/test')
    const body = await res.json() as { requestId: string; startTime: number }

    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/)
    expect(body.startTime).toEqual(expect.any(Number))
    expect(res.headers.get('X-Request-ID')).toBe(body.requestId)
    expect(res.headers.get('X-Response-Time')).toMatch(/^\d+ms$/)
  })

  it('preserves incoming request ids', async () => {
    const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

    app.use('*', requestContextMiddleware())
    app.get('/test', (c) => c.json({ requestId: c.get('requestId') }))

    const res = await app.request('/test', {
      headers: {
        'X-Request-ID': 'req-from-client',
      },
    })
    const body = await res.json() as { requestId: string }

    expect(body.requestId).toBe('req-from-client')
    expect(res.headers.get('X-Request-ID')).toBe('req-from-client')
  })

  it('does not overwrite response time set by route-level middleware', async () => {
    const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

    app.use('*', requestContextMiddleware())
    app.get('/test', (c) => {
      c.header('X-Response-Time', 'route-time')
      return c.json({ ok: true })
    })

    const res = await app.request('/test')

    expect(res.headers.get('X-Response-Time')).toBe('route-time')
  })
})
