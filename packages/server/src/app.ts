/**
 * Main Application Factory
 *
 * Creates a configured Worker Blog application with all core functionality
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import type { D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types'
import {
  apiRoutes,
  apiMediaRoutes,
  apiSystemRoutes,
  adminApiRoutes,
  authRoutes,
  testCleanupRoutes,
  publicFormsRoutes,
  createAdminSpaRoutes,
  adminApiContentRoutes,
  adminApiFormsRoutes,
  adminApiMediaRoutes,
  adminApiCollectionsRoutes,
  adminApiProfileRoutes,
} from './routes'
import { getCoreVersion } from './utils/version'
import { bootstrapMiddleware } from './middleware/bootstrap'
import { metricsMiddleware } from './middleware/metrics'
import { csrfProtection } from './middleware/csrf'
import { securityHeadersMiddleware } from './middleware/security-headers'
import { createDatabaseToolsAdminRoutes } from './plugins/core-plugins/database-tools-plugin/admin-routes'
import { createSeedDataAdminRoutes } from './plugins/core-plugins/seed-data-plugin/admin-routes'
import { emailPlugin } from './plugins/core-plugins/email-plugin'
import { otpLoginPlugin } from './plugins/core-plugins/otp-login-plugin'
import { oauthProvidersPlugin } from './plugins/core-plugins/oauth-providers'
import { userProfilesPlugin } from './plugins/core-plugins/user-profiles'
import { aiSearchPlugin } from './plugins/core-plugins/ai-search-plugin'
import { createMagicLinkAuthPlugin } from './plugins/available/magic-link-auth'
import { securityAuditPlugin } from './plugins/core-plugins/security-audit-plugin'
import { securityAuditMiddleware } from './plugins/core-plugins/security-audit-plugin'
import { stripePlugin } from './plugins/core-plugins/stripe-plugin'
import { requireAuth, requireRole } from './middleware/auth'
import { analyticsPlugin } from './plugins/core-plugins/analytics'
import { eventsApiRoutes } from './plugins/core-plugins/analytics/routes/api'
import cachePlugin from './plugins/cache'
import { faviconSvg } from './assets/favicon'
import { setAppInstance } from './services/route-metadata'

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

  // Plugins configuration
  plugins?: {
    directory?: string
    autoLoad?: boolean
    disableAll?: boolean  // Disable all plugins including core plugins
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

function registerApiPluginRoutes(
  app: WorkerBlogApp,
  routes: Array<{ path: string; handler: Hono }>,
): void {
  for (const route of routes) {
    if (route.path.startsWith('/api/')) {
      app.route(route.path, route.handler as any)
      continue
    }

    if (route.path.startsWith('/auth/')) {
      app.route(`/api${route.path}`, route.handler as any)
    }
  }
}

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
 *   plugins: {
 *     directory: './src/plugins',
 *     autoLoad: true
 *   }
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

  // Metrics middleware - track all requests for real-time analytics
  app.use('*', metricsMiddleware())

  // Bootstrap middleware - runs migrations, syncs collections, and initializes plugins
  app.use('*', bootstrapMiddleware(config))

  // Custom middleware - before auth
  if (config.middleware?.beforeAuth) {
    for (const middleware of config.middleware.beforeAuth) {
      app.use('*', middleware)
    }
  }

  // Logging middleware
  app.use('*', async (_c, next) => {
    // Logging logic here
    await next()
  })

  // Security middleware
  app.use('*', securityHeadersMiddleware())

  // CSRF protection middleware
  app.use('*', csrfProtection())

  // Custom middleware - after auth
  if (config.middleware?.afterAuth) {
    for (const middleware of config.middleware.afterAuth) {
      app.use('*', middleware)
    }
  }

  // Admin API access control: require authentication and admin role by default
  const adminRoles = config.adminAccessRoles || ['admin']
  app.use('/api/admin/*', requireAuth())
  app.use('/api/admin/*', requireRole(adminRoles))

  // Core routes
  // Routes are being imported incrementally from routes/*
  // Each route is tested and migrated one-by-one
  app.route('/api', apiRoutes)
  app.route('/api/media', apiMediaRoutes)
  app.route('/api/system', apiSystemRoutes)
  app.route('/api/admin/collections', adminApiCollectionsRoutes)
  app.route('/api/admin/profile', adminApiProfileRoutes)
  app.route('/api/admin', adminApiRoutes)
  app.route('/api/forms', publicFormsRoutes) // API endpoint for form submissions
  app.route('/api/admin/database-tools', createDatabaseToolsAdminRoutes())
  app.route('/api/admin/seed-data', createSeedDataAdminRoutes())
  app.route('/api/admin/content', adminApiContentRoutes)
  app.route('/api/admin/forms', adminApiFormsRoutes)
  app.route('/api/admin/media', adminApiMediaRoutes)
  // Security audit middleware - logs auth events (login, register, logout)
  app.use('/api/auth/*', securityAuditMiddleware())

  // Plugin routes - Security Audit (MUST be registered BEFORE admin/plugins to avoid route conflict)
  if (securityAuditPlugin.routes && securityAuditPlugin.routes.length > 0) {
    registerApiPluginRoutes(app, securityAuditPlugin.routes as any)
  }

  // Plugin routes - AI Search (MUST be registered BEFORE admin/plugins to avoid route conflict)
  // Register AI Search routes first so they take precedence over the generic /:id handler
  if (aiSearchPlugin.routes && aiSearchPlugin.routes.length > 0) {
    registerApiPluginRoutes(app, aiSearchPlugin.routes as any)
  }

  // Plugin routes - Cache (dashboard and management API)
  // Fixes GitHub Issue #461: Cache routes were not registered
  app.route('/api/admin/cache', cachePlugin.getRoutes())

  // Plugin routes - OAuth Providers (MUST be registered BEFORE admin/plugins to avoid route conflict)
  if (oauthProvidersPlugin.routes && oauthProvidersPlugin.routes.length > 0) {
    registerApiPluginRoutes(app, oauthProvidersPlugin.routes as any)
  }

  // Plugin routes - User Profiles
  if (userProfilesPlugin.routes && userProfilesPlugin.routes.length > 0) {
    registerApiPluginRoutes(app, userProfilesPlugin.routes as any)
  }

  // Plugin routes - OTP Login (MUST be registered BEFORE admin/plugins to avoid route conflict)
  // Register OTP Login routes first so they take precedence over the generic /:id handler
  if (otpLoginPlugin.routes && otpLoginPlugin.routes.length > 0) {
    registerApiPluginRoutes(app, otpLoginPlugin.routes as any)
  }

  // Plugin routes - Analytics (must be before /admin/plugins catch-all)
  if (analyticsPlugin.routes && analyticsPlugin.routes.length > 0) {
    registerApiPluginRoutes(app, analyticsPlugin.routes as any)
  }

  // Public event tracking API — POST /api/events (open), GET /api/events (admin)
  app.route('/api/events', eventsApiRoutes)

  // Plugin routes - Stripe (must be before /admin/plugins catch-all)
  if (stripePlugin.routes && stripePlugin.routes.length > 0) {
    registerApiPluginRoutes(app, stripePlugin.routes as any)
  }

  app.route('/', createAdminSpaRoutes())
  app.route('/api/auth', authRoutes)

  // Test cleanup routes (only for development/test environments)
  app.route('/', testCleanupRoutes)

  // Plugin routes - Email
  if (emailPlugin.routes && emailPlugin.routes.length > 0) {
    registerApiPluginRoutes(app, emailPlugin.routes as any)
  }

  // Plugin routes - Magic Link Auth (passwordless authentication via email links)
  const magicLinkPlugin = createMagicLinkAuthPlugin()
  if (magicLinkPlugin.routes && magicLinkPlugin.routes.length > 0) {
    registerApiPluginRoutes(app, magicLinkPlugin.routes as any)
  }

  // Serve favicon
  app.get('/favicon.svg', (c) => {
    return new Response(faviconSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000'
      }
    })
  })

  // Serve files from R2 storage (public file access)
  app.get('/files/*', async (c) => {
    try {
      // Extract the path from the URL pathname (everything after /files/)
      const url = new URL(c.req.url)
      const pathname = url.pathname

      // Remove the /files/ prefix to get the R2 object key
      const objectKey = pathname.replace(/^\/files\//, '')

      if (!objectKey) {
        return c.notFound()
      }

      // Get file from R2
      const object = await c.env.MEDIA_BUCKET.get(objectKey)

      if (!object) {
        return c.notFound()
      }

      // Set appropriate headers
      const headers = new Headers()
      object.httpMetadata?.contentType && headers.set('Content-Type', object.httpMetadata.contentType)
      object.httpMetadata?.contentDisposition && headers.set('Content-Disposition', object.httpMetadata.contentDisposition)
      headers.set('Cache-Control', 'public, max-age=31536000') // 1 year cache
      headers.set('Access-Control-Allow-Origin', '*') // Allow CORS for media files
      headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
      headers.set('Access-Control-Allow-Headers', 'Content-Type')

      return new Response(object.body as any, {
        headers
      })
    } catch (error) {
      console.error('Error serving file:', error)
      return c.notFound()
    }
  })

  // Custom routes - User-defined routes
  if (config.routes) {
    for (const route of config.routes) {
      app.route(route.path, route.handler)
    }
  }

  // Root redirect to the admin SPA
  app.get('/', (c) => {
    return c.redirect('/admin')
  })

  // Health check
  app.get('/api/health', (c) => {
    return c.json({
      name: appName,
      version: appVersion,
      status: 'running',
      timestamp: new Date().toISOString()
    })
  })

  // Store app instance for route introspection (API reference auto-discovery)
  setAppInstance(app)

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
