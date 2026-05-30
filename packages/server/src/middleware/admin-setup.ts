/**
 * Admin Setup Middleware
 *
 * Redirects to registration page when no admin user exists (fresh install)
 * Uses lazy initialization with in-memory caching for performance
 */

import type { Context, Next } from 'hono'
import { checkAdminUserExists } from '../services/auth-validation'

/**
 * Middleware that redirects to registration when no admin user exists
 * Skips auth routes and static assets to allow setup flow to work
 */
export function adminSetupMiddleware() {
  return async (c: Context, next: Next) => {
    const path = new URL(c.req.url).pathname

    // Skip auth routes - always allow access
    if (path.startsWith('/api/auth/')) {
      return next()
    }

    // Skip static assets
    if (path.match(/\.(js|css|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
      return next()
    }

    // Skip health check endpoint
    if (path === '/health') {
      return next()
    }

    // Skip API routes that might be needed during setup
    if (path.startsWith('/api/')) {
      return next()
    }

    // Check if admin exists (uses in-memory cache after first check)
    const db = c.env.DB
    const adminExists = await checkAdminUserExists(db)

    if (!adminExists) {
      // The SPA is mounted at the root, so setup redirects any page route.
      if (!path.startsWith('/auth/')) {
        return c.redirect('/auth/register?setup=true')
      }
    }

    return next()
  }
}
