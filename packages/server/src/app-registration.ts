import { Hono } from 'hono'
import {
  apiRoutes,
  apiMediaRoutes,
  apiSystemRoutes,
  adminApiRoutes,
  authRoutes,
  testCleanupRoutes,
  createAdminSpaRoutes,
  adminApiContentRoutes,
  adminApiMediaRoutes,
  adminApiCollectionsRoutes,
  adminApiProfileRoutes,
} from './routes'
import { bootstrapMiddleware } from './middleware/bootstrap'
import { metricsMiddleware } from './middleware/metrics'
import { requestContextMiddleware } from './middleware/request-context'
import { requestLoggingMiddleware } from './middleware/request-logging'
import { csrfProtection } from './middleware/csrf'
import { securityHeadersMiddleware } from './middleware/security-headers'
import { requireAuth, requireRole } from './middleware/auth'
import { getServerEnvConfig } from './config/env'
import { createDatabaseToolsAdminRoutes } from './features/database-tools/admin-routes'
import { createSeedDataAdminRoutes } from './features/seed-data/admin-routes'
import { securityAuditMiddleware } from './features/security-audit'
import { securityAuditApiRoutes } from './features/security-audit/routes/api'
import securityAuditAdminApiRoutes from './features/security-audit/routes/admin-api'
import { eventsApiRoutes } from './features/analytics/routes/api'
import analyticsAdminApiRoutes from './features/analytics/routes/admin-api'
import { faviconSvg } from './assets/favicon'
import { setAppInstance } from './services/route-metadata'
import type { WorkerBlogApp, WorkerBlogConfig } from './app'

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

  // Request context middleware
  app.use('*', requestContextMiddleware())

  // Durable request logging - opt-in via env so default hot paths stay in-memory only
  app.use('*', requestLoggingMiddleware({
    enabled: (env) => getServerEnvConfig(env).requestLoggingEnabled,
  }))

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
  app.route('/api/admin/database-tools', createDatabaseToolsAdminRoutes())
  app.route('/api/admin/seed-data', createSeedDataAdminRoutes())
  app.route('/api/admin/content', adminApiContentRoutes)
  app.route('/api/admin/media', adminApiMediaRoutes)
}

export function registerFeatureRoutes(app: WorkerBlogApp): void {
  // Security audit middleware - logs auth events (login, register, logout)
  app.use('/api/auth/*', securityAuditMiddleware())
  app.route('/api/security-audit', securityAuditApiRoutes)
  app.route('/api/admin/security-audit', securityAuditAdminApiRoutes)

  // Public event tracking API — POST /api/events (open), GET /api/events (admin)
  app.route('/api/events', eventsApiRoutes)
  app.route('/api/admin/analytics', analyticsAdminApiRoutes)
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
