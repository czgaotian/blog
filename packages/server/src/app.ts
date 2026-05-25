/**
 * Main Application Factory
 *
 * Creates a configured Worker Blog application with all core functionality
 */

import { Hono } from 'hono'
import type { Bindings, Variables, WorkerBlogApp, WorkerBlogConfig } from './types/app'
import { getCoreVersion } from './utils/version'
import {
  registerAssetsAndFallbackRoutes,
  registerCoreApiRoutes,
  registerCoreMiddleware,
  registerFeatureRoutes,
} from './app-registration'

export type { Bindings, Variables, WorkerBlogApp, WorkerBlogConfig } from './types/app'

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
