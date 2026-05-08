import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware'
import { metricsTracker } from '@worker-blog/shared/utils/metrics'
import type { DashboardResponse } from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../app'

export const adminApiDashboardRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminApiDashboardRoutes.use('*', requireAuth())
adminApiDashboardRoutes.use('*', requireRole(['admin', 'editor']))

adminApiDashboardRoutes.get('/', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const db = c.env.DB

  // Stats
  let collections = 0, contentItems = 0, mediaFiles = 0, mediaSize = 0, users = 0, databaseSize = 0
  try {
    const r = await db.prepare("SELECT COUNT(*) as count FROM collections WHERE is_active = 1 AND (source_type IS NULL OR source_type = 'user')").first()
    collections = (r as any)?.count || 0
  } catch {}
  try {
    const r = await db.prepare("SELECT COUNT(*) as count FROM content c JOIN collections col ON c.collection_id = col.id WHERE c.deleted_at IS NULL AND (col.source_type IS NULL OR col.source_type = 'user')").first()
    contentItems = (r as any)?.count || 0
  } catch {}
  try {
    const r = await db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as total_size FROM media WHERE deleted_at IS NULL').first()
    mediaFiles = (r as any)?.count || 0
    mediaSize = (r as any)?.total_size || 0
  } catch {}
  try {
    const r = await db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').first()
    users = (r as any)?.count || 0
  } catch {}
  try {
    const r = await db.prepare('SELECT 1').run()
    databaseSize = (r as any)?.meta?.size_after || 0
  } catch {}

  // Recent activity
  let recentActivity: DashboardResponse['recentActivity'] = []
  try {
    const { results } = await db.prepare(`
      SELECT a.id, a.action, a.resource_type, a.created_at, u.email, u.first_name, u.last_name
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.resource_type IN ('content', 'collections', 'users', 'media')
      ORDER BY a.created_at DESC
      LIMIT 10
    `).bind().all()
    recentActivity = (results || []).map((row: any) => {
      const user = row.first_name && row.last_name
        ? `${row.first_name} ${row.last_name}`
        : row.email || 'System'
      const descriptions: Record<string, string> = { create: 'Created', update: 'Updated', delete: 'Deleted' }
      const verb = descriptions[row.action] || row.action
      return {
        id: row.id,
        type: row.resource_type,
        action: row.action,
        description: `${verb} ${row.resource_type}`,
        timestamp: new Date(Number(row.created_at)).toISOString(),
        user,
      }
    })
  } catch {}

  const response: DashboardResponse = {
    stats: { collections, contentItems, mediaFiles, users, mediaSize, databaseSize },
    recentActivity,
    metrics: {
      requestsPerSecond: metricsTracker.getRequestsPerSecond(),
      totalRequests: metricsTracker.getTotalRequests(),
      averageRPS: Number(metricsTracker.getAverageRPS().toFixed(2)),
      timestamp: new Date().toISOString(),
    },
  }

  return c.json(response)
})
