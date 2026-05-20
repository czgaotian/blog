import type { MiddlewareHandler } from 'hono'
import { getLogger, type Logger } from '../services/logger'
import { sanitizeRoute } from '../utils'
import type { Bindings, Variables } from '../app'

type WaitUntilContext = {
  waitUntil?: (promise: Promise<unknown>) => void
}

type EnabledResolver = boolean | ((env: Bindings) => boolean)

export interface RequestLoggingOptions {
  enabled?: EnabledResolver
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

    if (!isEnabled(enabled, c.env)) {
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

function isEnabled(enabled: EnabledResolver, env: Bindings): boolean {
  return typeof enabled === 'function' ? enabled(env) : enabled
}

function getExecutionContext(c: { executionCtx?: WaitUntilContext }): WaitUntilContext | undefined {
  try {
    return c.executionCtx
  } catch {
    return undefined
  }
}
