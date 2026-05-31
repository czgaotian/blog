import type { MiddlewareHandler } from 'hono'
import { SETUP_REQUIRED_CODE, type SetupRequiredResponse } from '@worker-blog/shared/admin-api'
import { checkAdminUserExists } from '../services/auth-validation'
import type { Bindings, Variables } from '../types/app'

function isSetupBypass(path: string, method: string): boolean {
  return (
    (path === '/api/auth/register' && method === 'POST') ||
    (path === '/api/health' && method === 'GET')
  )
}

/**
 * Blocks API traffic until the first admin account exists.
 */
export function setupGuardMiddleware(): MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> {
  return async (c, next) => {
    const url = new URL(c.req.url)
    const path = url.pathname
    const method = c.req.method.toUpperCase()

    if (isSetupBypass(path, method)) {
      return next()
    }

    const adminExists = await checkAdminUserExists(c.env.DB)
    if (!adminExists) {
      const response: SetupRequiredResponse = {
        error: 'Initial admin account is required',
        code: SETUP_REQUIRED_CODE,
      }
      return c.json(response, 428)
    }

    return next()
  }
}
