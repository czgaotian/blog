import type { MiddlewareHandler } from 'hono'
import type { Bindings, Variables } from '../app'

export function requestContextMiddleware(): MiddlewareHandler<{
  Bindings: Bindings
  Variables: Variables
}> {
  return async (c, next) => {
    const requestId = c.req.header('X-Request-ID') || crypto.randomUUID()
    const startTime = Date.now()

    c.set('requestId', requestId)
    if (c.get('startTime') === undefined) {
      c.set('startTime', startTime)
    }

    await next()

    c.header('X-Request-ID', requestId)
    if (!c.res.headers.has('X-Response-Time')) {
      c.header('X-Response-Time', `${Date.now() - startTime}ms`)
    }
  }
}
