import { describe, expect, it, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { metricsTracker } from '@worker-blog/shared/utils/metrics'
import { metricsMiddleware } from './metrics'

describe('metricsMiddleware', () => {
  beforeEach(() => {
    metricsTracker.reset()
  })

  it('records low-cardinality status and duration metrics', async () => {
    const app = new Hono()

    app.use('*', metricsMiddleware())
    app.get('/ok', (c) => c.json({ ok: true }))
    app.get('/missing', (c) => c.json({ error: 'missing' }, 404))

    await app.request('/ok')
    await app.request('/missing')

    expect(metricsTracker.getTotalRequests()).toBe(2)
    expect(metricsTracker.getStatusClassCounts()).toEqual({
      '2xx': 1,
      '4xx': 1,
    })
    expect(metricsTracker.getAverageDurationMs()).toBeGreaterThanOrEqual(0)
  })

  it('does not track the dashboard metrics endpoint itself', async () => {
    const app = new Hono()

    app.use('*', metricsMiddleware())
    app.get('/admin/dashboard/api/metrics', (c) => c.json({ ok: true }))

    await app.request('/admin/dashboard/api/metrics')

    expect(metricsTracker.getTotalRequests()).toBe(0)
  })
})
