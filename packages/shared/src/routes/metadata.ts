/**
 * Shared route metadata used by the server API reference route and admin UI.
 */

export interface RouteMetadata {
  method: string
  path: string
  description: string
  authentication: boolean | 'unknown'
  category: string
  documented: boolean
}

export interface RouteMeta {
  description: string
  authentication: boolean
  category: string
}

export interface CategoryInfo {
  title: string
  description: string
  icon: string
}

export const CATEGORY_INFO: Record<string, CategoryInfo> = {
  Auth: {
    title: 'Authentication',
    description: 'Password-based user authentication endpoints',
    icon: 'lock',
  },
  Content: {
    title: 'Content Management',
    description: 'Content collections, entries, and versions',
    icon: 'file-text',
  },
  Media: {
    title: 'Media Management',
    description: 'File upload, storage, and media operations',
    icon: 'image',
  },
  Admin: {
    title: 'Admin Interface',
    description: 'Administrative panel and management APIs',
    icon: 'settings',
  },
  Logs: {
    title: 'Logs',
    description: 'System and activity logging',
    icon: 'activity',
  },
  Security: {
    title: 'Security Audit',
    description: 'Security event monitoring and lockout management',
    icon: 'shield',
  },
  Analytics: {
    title: 'Analytics',
    description: 'Event tracking and analytics dashboards',
    icon: 'bar-chart',
  },
  System: {
    title: 'System',
    description: 'Health checks and system information',
    icon: 'wrench',
  },
  Files: {
    title: 'Files',
    description: 'Public file serving from R2 storage',
    icon: 'folder',
  },
}

export const ROUTE_METADATA: Record<string, RouteMeta> = {
  'POST /api/auth/login': { description: 'Authenticate user with email and password', category: 'Auth', authentication: false },
  'POST /api/auth/register': { description: 'Register a new user account', category: 'Auth', authentication: false },
  'POST /api/auth/logout': { description: 'Log out the current user', category: 'Auth', authentication: true },
  'GET /api/auth/me': { description: 'Get current authenticated user information', category: 'Auth', authentication: true },
  'POST /api/auth/refresh': { description: 'Refresh authentication token', category: 'Auth', authentication: true },
  'POST /api/auth/seed-admin': { description: 'Create or reset the admin user account', category: 'Auth', authentication: false },

  'GET /api/collections': { description: 'List public collections', category: 'Content', authentication: false },
  'GET /api/collections/:collection/content': { description: 'List public content in a collection', category: 'Content', authentication: false },
  'GET /api/content/:id': { description: 'Get a content item by ID', category: 'Content', authentication: false },
  'POST /api/content': { description: 'Create a content item', category: 'Content', authentication: true },
  'PUT /api/content/:id': { description: 'Update a content item', category: 'Content', authentication: true },
  'DELETE /api/content/:id': { description: 'Delete a content item', category: 'Content', authentication: true },
  'GET /api/content/:id/versions': { description: 'Get content version history', category: 'Content', authentication: true },
  'POST /api/content/:id/restore/:versionId': { description: 'Restore a content version', category: 'Content', authentication: true },

  'GET /api/media': { description: 'List media files', category: 'Media', authentication: false },
  'GET /api/media/:id': { description: 'Get a media file by ID', category: 'Media', authentication: false },
  'POST /api/media/upload': { description: 'Upload a media file', category: 'Media', authentication: true },
  'DELETE /api/media/:id': { description: 'Delete a media file', category: 'Media', authentication: true },

  'GET /api/admin/me': { description: 'Get admin session data', category: 'Admin', authentication: true },
  'GET /api/admin/dashboard': { description: 'Get admin dashboard data', category: 'Admin', authentication: true },
  'GET /api/admin/collections': { description: 'List collections for admin management', category: 'Admin', authentication: true },
  'POST /api/admin/collections': { description: 'Create a collection', category: 'Admin', authentication: true },
  'GET /api/admin/collections/:id': { description: 'Get a collection', category: 'Admin', authentication: true },
  'PATCH /api/admin/collections/:id': { description: 'Update a collection', category: 'Admin', authentication: true },
  'DELETE /api/admin/collections/:id': { description: 'Delete a collection', category: 'Admin', authentication: true },
  'GET /api/admin/content': { description: 'List content for admin management', category: 'Admin', authentication: true },
  'POST /api/admin/content': { description: 'Create content via admin API', category: 'Admin', authentication: true },
  'PUT /api/admin/content/:id': { description: 'Update content via admin API', category: 'Admin', authentication: true },
  'DELETE /api/admin/content/:id': { description: 'Delete content via admin API', category: 'Admin', authentication: true },
  'GET /api/admin/media': { description: 'List media for admin management', category: 'Admin', authentication: true },
  'POST /api/admin/media/upload': { description: 'Upload media via admin API', category: 'Admin', authentication: true },
  'GET /api/admin/users': { description: 'List users', category: 'Admin', authentication: true },
  'POST /api/admin/users': { description: 'Create a user', category: 'Admin', authentication: true },
  'PUT /api/admin/users/:id': { description: 'Update a user', category: 'Admin', authentication: true },
  'DELETE /api/admin/users/:id': { description: 'Delete a user', category: 'Admin', authentication: true },
  'GET /api/admin/settings': { description: 'Get application settings', category: 'Admin', authentication: true },
  'PUT /api/admin/settings': { description: 'Update application settings', category: 'Admin', authentication: true },

  'GET /api/admin/logs': { description: 'List system logs', category: 'Logs', authentication: true },
  'GET /api/admin/security-audit': { description: 'Get security audit dashboard', category: 'Security', authentication: true },
  'DELETE /api/admin/security-audit/lockouts/:key': { description: 'Release a security lockout', category: 'Security', authentication: true },
  'POST /api/admin/security-audit/events/purge': { description: 'Purge old security events', category: 'Security', authentication: true },
  'GET /api/admin/analytics': { description: 'Get analytics dashboard', category: 'Analytics', authentication: true },
  'POST /api/events': { description: 'Track an analytics event', category: 'Analytics', authentication: false },
  'GET /api/events': { description: 'Query analytics events', category: 'Analytics', authentication: true },

  'GET /api/health': { description: 'Health check endpoint', category: 'System', authentication: false },
  'GET /api': { description: 'API root', category: 'System', authentication: false },
  'GET /api/system/info': { description: 'Get system information and version', category: 'System', authentication: false },
  'GET /api/system/schema': { description: 'Get database schema information', category: 'System', authentication: false },
  'GET /files/*': { description: 'Serve files from R2 storage', category: 'Files', authentication: false },
}

export const INCLUDED_ROUTE_PATTERNS: RegExp[] = [
  /^\/api$/,
  /^\/api\//,
  /^\/files\//,
]

export const EXCLUDED_ROUTES = new Set<string>()

export function isIncludedRoute(method: string, path: string): boolean {
  const key = `${method} ${path}`
  if (EXCLUDED_ROUTES.has(key)) {
    return false
  }

  return INCLUDED_ROUTE_PATTERNS.some((pattern) => pattern.test(path))
}

export function inferCategory(path: string): string {
  if (path.startsWith('/api/auth/')) return 'Auth'
  if (path.startsWith('/api/media')) return 'Media'
  if (path.startsWith('/api/system')) return 'System'
  if (path.startsWith('/api/content') || path.startsWith('/api/collections')) return 'Content'
  if (path.startsWith('/api/admin/logs')) return 'Logs'
  if (path.startsWith('/api/admin/security-audit') || path.startsWith('/api/security-audit')) return 'Security'
  if (path.startsWith('/api/admin/analytics') || path.startsWith('/api/events')) return 'Analytics'
  if (path.startsWith('/api/admin')) return 'Admin'
  if (path.startsWith('/files/')) return 'Files'
  if (path === '/api/health' || path.startsWith('/api')) return 'System'
  return 'Other'
}

export function inferAuth(path: string): boolean | 'unknown' {
  if (path === '/api/health') return false
  if (path === '/api/system/info' || path === '/api/system/schema') return false
  if (path.startsWith('/files/')) return false
  if (path === '/api/events') return false
  if (path.startsWith('/api/admin')) return true
  if (path.startsWith('/api/auth/me') || path.startsWith('/api/auth/logout')) return true
  return 'unknown'
}
