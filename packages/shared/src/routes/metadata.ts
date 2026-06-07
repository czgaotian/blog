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
    description: 'Blog content entries and versions',
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
  'POST /api/auth/register': { description: 'Create the first admin account', category: 'Auth', authentication: false },
  'POST /api/auth/logout': { description: 'Log out the current user', category: 'Auth', authentication: true },
  'POST /api/auth/refresh': { description: 'Refresh authentication token', category: 'Auth', authentication: true },
  'GET /api/auth/session': { description: 'Get current authenticated session information', category: 'Auth', authentication: true },

  'GET /api/contents': { description: 'List public contents', category: 'Content', authentication: false },
  'GET /api/contents/:id': { description: 'Get a content item by ID', category: 'Content', authentication: false },
  'GET /api/category/:slug': { description: 'List published contents in a category', category: 'Content', authentication: false },
  'GET /api/tag/:slug': { description: 'List published contents with a tag', category: 'Content', authentication: false },

  'GET /api/media': { description: 'List media files', category: 'Media', authentication: true },
  'GET /api/media/:id': { description: 'Get a media file by ID', category: 'Media', authentication: true },
  'POST /api/media/upload': { description: 'Upload a media file', category: 'Media', authentication: true },
  'POST /api/media/upload-multiple': { description: 'Upload media files', category: 'Media', authentication: true },
  'PATCH /api/media/:id': { description: 'Update media metadata', category: 'Media', authentication: true },
  'DELETE /api/media/:id': { description: 'Delete a media file', category: 'Media', authentication: true },
  'POST /api/media/bulk-delete': { description: 'Delete multiple media files', category: 'Media', authentication: true },

  'GET /api/admin/dashboard': { description: 'Get admin dashboard data', category: 'Admin', authentication: true },
  'GET /api/admin/contents': { description: 'List content for admin management', category: 'Admin', authentication: true },
  'POST /api/admin/contents': { description: 'Create content via admin API', category: 'Admin', authentication: true },
  'PUT /api/admin/contents/:id': { description: 'Update content via admin API', category: 'Admin', authentication: true },
  'DELETE /api/admin/contents/:id': { description: 'Delete content via admin API', category: 'Admin', authentication: true },
  'GET /api/admin/categories': { description: 'List categories for admin management', category: 'Admin', authentication: true },
  'POST /api/admin/categories': { description: 'Create a category via admin API', category: 'Admin', authentication: true },
  'PUT /api/admin/categories/:id': { description: 'Update a category via admin API', category: 'Admin', authentication: true },
  'DELETE /api/admin/categories/:id': { description: 'Delete a category via admin API', category: 'Admin', authentication: true },
  'GET /api/admin/tags': { description: 'List tags for admin management', category: 'Admin', authentication: true },
  'POST /api/admin/tags': { description: 'Create a tag via admin API', category: 'Admin', authentication: true },
  'PUT /api/admin/tags/:id': { description: 'Update a tag via admin API', category: 'Admin', authentication: true },
  'DELETE /api/admin/tags/:id': { description: 'Delete a tag via admin API', category: 'Admin', authentication: true },
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
  if (path === '/api' || path === '/api/health') return 'System'
  if (
    path.startsWith('/api/contents') ||
    path.startsWith('/api/category') ||
    path.startsWith('/api/tag')
  ) return 'Content'
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
  if (path === '/api' || path === '/api/health') return false
  if (path.startsWith('/files/')) return false
  if (path === '/api/events') return false
  if (path.startsWith('/api/admin')) return true
  if (path.startsWith('/api/auth/session') || path.startsWith('/api/auth/me') || path.startsWith('/api/auth/logout')) return true
  return 'unknown'
}
