/**
 * Routes Module Exports
 *
 * Routes are being migrated incrementally from the monolith.
 * Each route is refactored to remove monolith-specific dependencies.
 */

// API routes
export { default as apiRoutes } from './api'
export { default as apiContentCrudRoutes } from './api-content-crud'
export { default as apiMediaRoutes } from './api-media'
export { default as adminApiRoutes } from './admin-api'

// Auth routes
export { default as authRoutes } from './auth'

// SPA fallback route
export { createSpaFallbackRoutes } from './spa-fallback'
export { adminApiContentRoutes } from './admin-api-content'
export { adminApiProfileRoutes } from './admin-api-profile'

export const ROUTES_INFO = {
  message: 'Core routes available',
  available: [
    'apiRoutes',
    'apiContentCrudRoutes',
    'apiMediaRoutes',
    'adminApiRoutes',
    'authRoutes',
    'createSpaFallbackRoutes'
  ],
  status: 'Core package routes ready',
  reference: 'https://github.com/worker-blog/worker-blog'
} as const
