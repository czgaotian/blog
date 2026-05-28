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

// Admin UI routes
export { createAdminSpaRoutes } from './admin-spa'
export { adminApiContentRoutes } from './admin-api-content'
export { adminApiCollectionsRoutes } from './admin-api-collections'
export { adminApiProfileRoutes } from './admin-api-profile'

export const ROUTES_INFO = {
  message: 'Core routes available',
  available: [
    'apiRoutes',
    'apiContentCrudRoutes',
    'apiMediaRoutes',
    'adminApiRoutes',
    'authRoutes',
    'createAdminSpaRoutes'
  ],
  status: 'Core package routes ready',
  reference: 'https://github.com/worker-blog/worker-blog'
} as const
