import type { MiddlewareHandler } from 'hono'
import { getLogger, type Logger } from '../services/logger'
import { sanitizeRoute } from '../utils'
import type { Bindings, Variables } from '../app'

type WaitUntilContext = {
  waitUntil?: (promise: Promise<unknown>) => void
}

export interface RequestLoggingOptions {
  enabled?: boolean
  loggerFactory?: (db: D1Database) => Pick<Logger, 'logRequest'>
}

export function requestLoggingMiddleware(options: RequestLoggingOptions = {}): MiddlewareHandler<{
  Bindings: Bindings
  Variables: Variables
}> {
  const enabled = options.enabled ?? false
  const loggerFactory = options.loggerFactory ?? getLogger

  return async (c, next) => {
    const startedAt = c.get('startTime') ?? Date.now()

    await next()

    if (!enabled) {
      return
    }

    const url = new URL(c.req.url)
    const sanitizedPath = sanitizeRoute(url.pathname)
    const user = c.get('user')
    const logPromise = Promise.resolve()
      .then(() => loggerFactory(c.env.DB))
      .then((logger) => logger.logRequest(
        c.req.method,
        sanitizedPath,
        c.res.status,
        Date.now() - startedAt,
        {
          requestId: c.get('requestId'),
          userId: user?.userId,
          source: 'request-logging-middleware',
        },
      ))
      .catch((error) => {
        console.error('[request-logging] Failed to log request:', error)
      })

    const executionCtx = getExecutionContext(c)
    if (executionCtx?.waitUntil) {
      executionCtx.waitUntil(logPromise)
      return
    }

    await logPromise
  }
}

function getExecutionContext(c: { executionCtx?: WaitUntilContext }): WaitUntilContext | undefined {
  try {
    return c.executionCtx
  } catch {
    return undefined
  }
}
