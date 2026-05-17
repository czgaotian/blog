import { MiddlewareHandler } from 'hono'
import { metricsTracker } from '@worker-blog/shared/utils/metrics'

/**
 * Middleware to track all HTTP requests for real-time analytics
 * Excludes the metrics endpoint itself to avoid inflating the count
 */
export const metricsMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const path = new URL(c.req.url).pathname
    const startTime = Date.now()

    await next()

    // Don't track the metrics endpoint itself to avoid self-inflating counts
    if (path !== '/admin/dashboard/api/metrics') {
      metricsTracker.recordRequest({
        method: c.req.method,
        statusCode: c.res.status,
        durationMs: Date.now() - startTime,
      })
    }
  }
}
