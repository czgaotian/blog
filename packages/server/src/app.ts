/**
 * Main Application Factory
 *
 * Creates a configured Worker Blog application with all core functionality
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import type { D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types'
import { getCoreVersion } from './utils/version'
import {
  registerAssetsAndFallbackRoutes,
  registerCoreApiRoutes,
  registerCoreMiddleware,
  registerFeatureRoutes,
} from './app-registration'

// ============================================================================
// Type Definitions
// ============================================================================

export interface Bindings {
  DB: D1Database
  CACHE_KV: KVNamespace
  MEDIA_BUCKET: R2Bucket
  ASSETS: Fetcher
  EMAIL_QUEUE?: Queue
  SENDGRID_API_KEY?: string
  RESEND_API_KEY?: string
  DEFAULT_FROM_EMAIL?: string
  DEFAULT_FROM_NAME?: string
  IMAGES_ACCOUNT_ID?: string
  IMAGES_API_TOKEN?: string
  ENVIRONMENT?: string
  CORS_ORIGINS?: string
  JWT_SECRET?: string
  JWT_EXPIRES_IN?: string
  JWT_REFRESH_GRACE_SECONDS?: string
  BUCKET_NAME?: string
  GOOGLE_MAPS_API_KEY?: string
  STRIPE_PUBLISHABLE_KEY?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  STRIPE_PRICE_ID?: string
  STRIPE_SUCCESS_URL?: string
  STRIPE_CANCEL_URL?: string
  GITHUB_OAUTH_CLIENT_ID?: string
  GITHUB_OAUTH_CLIENT_SECRET?: string
  GOOGLE_OAUTH_CLIENT_ID?: string
  GOOGLE_OAUTH_CLIENT_SECRET?: string
  TURNSTILE_SITE_KEY?: string
  TURNSTILE_SECRET_KEY?: string
}

export interface Variables {
  user?: {
    userId: string
    email: string
    role: string
    exp: number
    iat: number
  }
  requestId?: string
  startTime?: number
  appName?: string
  appVersion?: string
  csrfToken?: string
}

export interface WorkerBlogConfig {
  // Collections configuration
  collections?: {
    directory?: string
    autoSync?: boolean
  }

  // Custom routes
  routes?: Array<{
    path: string
    handler: Hono
  }>

  // Custom middleware
  middleware?: {
    beforeAuth?: Array<(c: Context, next: () => Promise<void>) => Promise<void>>
    afterAuth?: Array<(c: Context, next: () => Promise<void>) => Promise<void>>
  }

  // Admin access control
  // Roles allowed to access the /admin panel. Defaults to ['admin'].
  adminAccessRoles?: string[]

  // App metadata
  version?: string
  name?: string
}

export type WorkerBlogApp = Hono<{ Bindings: Bindings; Variables: Variables }>

// ============================================================================
// Application Factory
// ============================================================================

/**
 * Create a Worker Blog application with core functionality
 *
 * @param config - Application configuration
 * @returns Configured Hono application
 *
 * @example
 * ```typescript
 * import { createWorkerBlogApp } from '@worker-blog/server'
 *
 * const app = createWorkerBlogApp({
 *   collections: {
 *     directory: './src/collections',
 *     autoSync: true
 *   },
 * })
 *
 * export default app
 * ```
 */
export function createWorkerBlogApp(config: WorkerBlogConfig = {}): WorkerBlogApp {
  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

  // Set app metadata
  const appVersion = config.version || getCoreVersion()
  const appName = config.name || 'Worker Blog'

  // App metadata middleware
  app.use('*', async (c, next) => {
    c.set('appName', appName)
    c.set('appVersion', appVersion)
    await next()
  })

  registerCoreMiddleware(app, config)
  registerCoreApiRoutes(app)
  registerFeatureRoutes(app)
  registerAssetsAndFallbackRoutes(app, config, appName, appVersion)

  // 404 handler
  app.notFound((c) => {
    return c.json({ error: 'Not Found', status: 404 }, 404)
  })

  // Error handler
  app.onError((err, c) => {
    console.error(err)
    return c.json({ error: 'Internal Server Error', status: 500 }, 500)
  })

  return app
}

/**
 * Setup core middleware (backward compatibility)
 *
 * @param _app - Hono application
 * @deprecated Use createWorkerBlogApp() instead
 */
export function setupCoreMiddleware(_app: WorkerBlogApp): void {
  console.warn('setupCoreMiddleware is deprecated. Use createWorkerBlogApp() instead.')
  // Backward compatibility implementation
}

/**
 * Setup core routes (backward compatibility)
 *
 * @param _app - Hono application
 * @deprecated Use createWorkerBlogApp() instead
 */
export function setupCoreRoutes(_app: WorkerBlogApp): void {
  console.warn('setupCoreRoutes is deprecated. Use createWorkerBlogApp() instead.')
  // Backward compatibility implementation
}
