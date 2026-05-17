import { Hono } from 'hono'
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
import { bootstrapMiddleware } from './middleware/bootstrap'
import { metricsMiddleware } from './middleware/metrics'
import { csrfProtection } from './middleware/csrf'
import { securityHeadersMiddleware } from './middleware/security-headers'
import { requireAuth, requireRole } from './middleware/auth'
import { createDatabaseToolsAdminRoutes } from './features/database-tools/admin-routes'
import { createSeedDataAdminRoutes } from './features/seed-data/admin-routes'
import { emailFeature } from './features/email'
import { otpLoginFeature } from './features/auth/otp-login'
import { oauthProvidersFeature } from './features/auth/oauth-providers'
import { userProfilesFeature } from './features/user-profiles'
import { aiSearchFeature } from './features/ai-search'
import { createMagicLinkAuthFeature } from './features/auth/magic-link'
import { securityAuditFeature } from './features/security-audit'
import { securityAuditMiddleware } from './features/security-audit'
import { stripeFeature } from './features/stripe'
import { analyticsFeature } from './features/analytics'
import { eventsApiRoutes } from './features/analytics/routes/api'
import { workflowFeature } from './features/workflow'
import cacheFeature from './features/cache'
import { faviconSvg } from './assets/favicon'
import { setAppInstance } from './services/route-metadata'
import type { WorkerBlogApp, WorkerBlogConfig } from './app'

function registerBuiltInFeatureRoutes(
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

export function registerCoreMiddleware(app: WorkerBlogApp, config: WorkerBlogConfig): void {
  // Metrics middleware - track all requests for real-time analytics
  app.use('*', metricsMiddleware())

  // Bootstrap middleware - runs migrations and syncs collections
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
}

export function registerCoreApiRoutes(app: WorkerBlogApp): void {
  // Core routes
  // Routes are being imported incrementally from routes/*
  // Each route is tested and migrated one-by-one
  app.route('/api', apiRoutes)
  app.route('/api/media', apiMediaRoutes)
  app.route('/api/system', apiSystemRoutes)
  app.route('/api/admin/collections', adminApiCollectionsRoutes)
  app.route('/api/admin/profile', adminApiProfileRoutes)
  app.route('/api/admin', adminApiRoutes)
  app.route('/api/forms', publicFormsRoutes)
  app.route('/api/admin/database-tools', createDatabaseToolsAdminRoutes())
  app.route('/api/admin/seed-data', createSeedDataAdminRoutes())
  app.route('/api/admin/content', adminApiContentRoutes)
  app.route('/api/admin/forms', adminApiFormsRoutes)
  app.route('/api/admin/media', adminApiMediaRoutes)
}

export function registerFeatureRoutes(app: WorkerBlogApp): void {
  // Security audit middleware - logs auth events (login, register, logout)
  app.use('/api/auth/*', securityAuditMiddleware())

  // Built-in feature routes.
  registerBuiltInFeatureRoutes(app, securityAuditFeature.routes as any)
  registerBuiltInFeatureRoutes(app, aiSearchFeature.routes as any)

  // Cache dashboard and management API.
  // Fixes GitHub Issue #461: Cache routes were not registered
  app.route('/api/admin/cache', cacheFeature.getRoutes())

  registerBuiltInFeatureRoutes(app, oauthProvidersFeature.routes as any)
  registerBuiltInFeatureRoutes(app, userProfilesFeature.routes as any)
  registerBuiltInFeatureRoutes(app, otpLoginFeature.routes as any)
  registerBuiltInFeatureRoutes(app, analyticsFeature.routes as any)
  registerBuiltInFeatureRoutes(app, workflowFeature.routes as any)

  // Public event tracking API — POST /api/events (open), GET /api/events (admin)
  app.route('/api/events', eventsApiRoutes)

  registerBuiltInFeatureRoutes(app, stripeFeature.routes as any)
}

export function registerAssetsAndFallbackRoutes(
  app: WorkerBlogApp,
  config: WorkerBlogConfig,
  appName: string,
  appVersion: string,
): void {
  app.route('/', createAdminSpaRoutes())
  app.route('/api/auth', authRoutes)

  // Test cleanup routes (only for development/test environments)
  app.route('/', testCleanupRoutes)

  registerBuiltInFeatureRoutes(app, emailFeature.routes as any)

  // Magic link auth (passwordless authentication via email links).
  const magicLinkFeature = createMagicLinkAuthFeature()
  registerBuiltInFeatureRoutes(app, magicLinkFeature.routes as any)

  // Serve favicon
  app.get('/favicon.svg', (c) => {
    return new Response(faviconSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000',
      },
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
      headers.set('Cache-Control', 'public, max-age=31536000')
      headers.set('Access-Control-Allow-Origin', '*')
      headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
      headers.set('Access-Control-Allow-Headers', 'Content-Type')

      return new Response(object.body as any, {
        headers,
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
      timestamp: new Date().toISOString(),
    })
  })

  // Store app instance for route introspection (API reference auto-discovery)
  setAppInstance(app)
}
