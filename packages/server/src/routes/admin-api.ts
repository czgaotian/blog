/**
 * Admin API Routes
 *
 * Provides JSON API endpoints for admin operations
 * These routes complement the admin UI and can be used programmatically
 */

import { Hono } from 'hono'
// import { zValidator } from '@hono/zod-validator'
import { requireAuth, requireRole } from '../middleware'
import { adminApiDashboardRoutes } from './admin-api-dashboard'
import { adminApiLogsRoutes } from './admin-api-logs'
import { adminApiSettingsRoutes } from './admin-api-settings'
import type { Bindings, Variables } from '../app'

export const adminApiRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Apply auth middleware to all admin routes
adminApiRoutes.use('*', requireAuth())
adminApiRoutes.use('*', requireRole(['admin', 'editor']))

adminApiRoutes.route('/dashboard', adminApiDashboardRoutes)
adminApiRoutes.route('/logs', adminApiLogsRoutes)
adminApiRoutes.route('/settings', adminApiSettingsRoutes)

/**
 * Get dashboard statistics
 * GET /api/admin/stats
 */
adminApiRoutes.get('/stats', async (c) => {
  try {
    const db = c.env.DB

    // Get content count
    let contentCount = 0
    try {
      const contentStmt = db.prepare('SELECT COUNT(*) as count FROM content WHERE deleted_at IS NULL')
      const contentResult = await contentStmt.first()
      contentCount = (contentResult as any)?.count || 0
    } catch (error) {
      console.error('Error fetching content count:', error)
    }

    // Get media count and total size
    let mediaCount = 0
    let mediaSize = 0
    try {
      const mediaStmt = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as total_size FROM media WHERE deleted_at IS NULL')
      const mediaResult = await mediaStmt.first()
      mediaCount = (mediaResult as any)?.count || 0
      mediaSize = (mediaResult as any)?.total_size || 0
    } catch (error) {
      console.error('Error fetching media count:', error)
    }

    // Get users count
    let usersCount = 0
    try {
      const usersStmt = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1')
      const usersResult = await usersStmt.first()
      usersCount = (usersResult as any)?.count || 0
    } catch (error) {
      console.error('Error fetching users count:', error)
    }

    return c.json({
      contentItems: contentCount,
      mediaFiles: mediaCount,
      mediaSize: mediaSize,
      users: usersCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return c.json({ error: 'Failed to fetch statistics' }, 500)
  }
})

/**
 * Get storage usage
 * GET /api/admin/storage
 */
adminApiRoutes.get('/storage', async (c) => {
  try {
    const db = c.env.DB

    // Get database size from D1 metadata
    let databaseSize = 0
    try {
      const result = await db.prepare('SELECT 1').run()
      databaseSize = (result as any)?.meta?.size_after || 0
    } catch (error) {
      console.error('Error fetching database size:', error)
    }

    // Get media total size
    let mediaSize = 0
    try {
      const mediaStmt = db.prepare('SELECT COALESCE(SUM(size), 0) as total_size FROM media WHERE deleted_at IS NULL')
      const mediaResult = await mediaStmt.first()
      mediaSize = (mediaResult as any)?.total_size || 0
    } catch (error) {
      console.error('Error fetching media size:', error)
    }

    return c.json({
      databaseSize,
      mediaSize,
      totalSize: databaseSize + mediaSize,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching storage usage:', error)
    return c.json({ error: 'Failed to fetch storage usage' }, 500)
  }
})

/**
 * Get recent activity
 * GET /api/admin/activity
 */
adminApiRoutes.get('/activity', async (c) => {
  try {
    const db = c.env.DB
    const limit = parseInt(c.req.query('limit') || '10')

    // Get recent activities from activity_logs table
    const activityStmt = db.prepare(`
      SELECT
        a.id,
        a.action,
        a.resource_type,
        a.resource_id,
        a.details,
        a.created_at,
        u.email,
        u.first_name,
        u.last_name
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.resource_type IN ('content', 'users', 'media')
      ORDER BY a.created_at DESC
      LIMIT ?
    `)

    const { results } = await activityStmt.bind(limit).all()

    const recentActivity = (results || []).map((row: any) => {
      const userName = row.first_name && row.last_name
        ? `${row.first_name} ${row.last_name}`
        : row.email || 'System'

      let details: any = {}
      try {
        details = row.details ? JSON.parse(row.details) : {}
      } catch (e) {
        console.error('Error parsing activity details:', e)
      }

      return {
        id: row.id,
        type: row.resource_type,
        action: row.action,
        resource_id: row.resource_id,
        details,
        timestamp: new Date(Number(row.created_at)).toISOString(),
        user: userName
      }
    })

    return c.json({
      data: recentActivity,
      count: recentActivity.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return c.json({ error: 'Failed to fetch recent activity' }, 500)
  }
})

export default adminApiRoutes
