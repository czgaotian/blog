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
export { default as apiSystemRoutes } from './api-system'
export { default as adminApiRoutes } from './admin-api'

// Auth routes
export { default as authRoutes } from './auth'

// Test routes (only for development/test environments)
export { default as testCleanupRoutes } from './test-cleanup'

// Admin UI routes
export { default as publicFormsRoutes } from './public-forms'
export { createAdminSpaRoutes } from './admin-spa'
export { adminApiContentRoutes } from './admin-api-content'
export { adminApiFormsRoutes } from './admin-api-forms'
export { adminApiMediaRoutes } from './admin-api-media'
export { adminApiCollectionsRoutes } from './admin-api-collections'
export { adminApiProfileRoutes } from './admin-api-profile'

export const ROUTES_INFO = {
  message: 'Core routes available',
  available: [
    'apiRoutes',
    'apiContentCrudRoutes',
    'apiMediaRoutes',
    'apiSystemRoutes',
    'adminApiRoutes',
    'authRoutes',
    'testCleanupRoutes',
    'publicFormsRoutes',
    'createAdminSpaRoutes'
  ],
  status: 'Core package routes ready',
  reference: 'https://github.com/worker-blog/worker-blog'
} as const
