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

    // Get collections count
    let collectionsCount = 0
    try {
      const collectionsStmt = db.prepare('SELECT COUNT(*) as count FROM collections WHERE is_active = 1')
      const collectionsResult = await collectionsStmt.first()
      collectionsCount = (collectionsResult as any)?.count || 0
    } catch (error) {
      console.error('Error fetching collections count:', error)
    }

    // Get content count
    let contentCount = 0
    try {
      const contentStmt = db.prepare('SELECT COUNT(*) as count FROM content c JOIN collections col ON c.collection_id = col.id WHERE c.deleted_at IS NULL')
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
      collections: collectionsCount,
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
      WHERE a.resource_type IN ('content', 'collections', 'users', 'media')
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

/**
 * Get reference options for a collection
 * GET /api/admin/references?collection=<nameOrId>&search=<query>&limit=20&id=<contentId>
 */
adminApiRoutes.get('/references', async (c) => {
  try {
    const db = c.env.DB
    const url = new URL(c.req.url)
    const collectionParams = url.searchParams
      .getAll('collection')
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter(Boolean)
    const search = c.req.query('search') || ''
    const id = c.req.query('id') || ''
    const limit = Math.min(Number.parseInt(c.req.query('limit') || '20', 10) || 20, 100)

    if (collectionParams.length === 0) {
      return c.json({ error: 'Collection is required' }, 400)
    }

    const placeholders = collectionParams.map(() => '?').join(', ')
    const collectionStmt = db.prepare(`
      SELECT id, name, display_name
      FROM collections
      WHERE id IN (${placeholders}) OR name IN (${placeholders})
    `)
    const collectionResults = await collectionStmt
      .bind(...collectionParams, ...collectionParams)
      .all()
    const collections = (collectionResults.results || []) as any[]

    if (collections.length === 0) {
      return c.json({ error: 'Collection not found' }, 404)
    }

    const collectionById = Object.fromEntries(
      collections.map((entry) => [
        entry.id,
        {
          id: entry.id,
          name: entry.name,
          display_name: entry.display_name
        }
      ])
    )
    const collectionIds = collections.map((entry) => entry.id)

    if (id) {
      const idPlaceholders = collectionIds.map(() => '?').join(', ')
      const itemStmt = db.prepare(`
        SELECT id, title, slug, collection_id
        FROM content
        WHERE id = ? AND collection_id IN (${idPlaceholders})
        LIMIT 1
      `)
      const item = await itemStmt.bind(id, ...collectionIds).first() as any

      if (!item) {
        return c.json({ error: 'Reference not found' }, 404)
      }

      return c.json({
        data: {
          id: item.id,
          title: item.title,
          slug: item.slug,
          collection: collectionById[item.collection_id]
        }
      })
    }

    let stmt
    let results

    const listPlaceholders = collectionIds.map(() => '?').join(', ')
    const statusFilterValues = ['published']
    const statusClause = ` AND status IN (${statusFilterValues.map(() => '?').join(', ')})`

    if (search) {
      const searchParam = `%${search}%`
      stmt = db.prepare(`
        SELECT id, title, slug, status, updated_at, collection_id
        FROM content
        WHERE collection_id IN (${listPlaceholders})
        AND (title LIKE ? OR slug LIKE ?)
        ${statusClause}
        ORDER BY updated_at DESC
        LIMIT ?
      `)
      const queryResults = await stmt
        .bind(...collectionIds, searchParam, searchParam, ...statusFilterValues, limit)
        .all()
      results = queryResults.results
    } else {
      stmt = db.prepare(`
        SELECT id, title, slug, status, updated_at, collection_id
        FROM content
        WHERE collection_id IN (${listPlaceholders})
        ${statusClause}
        ORDER BY updated_at DESC
        LIMIT ?
      `)
      const queryResults = await stmt
        .bind(...collectionIds, ...statusFilterValues, limit)
        .all()
      results = queryResults.results
    }

    const items = (results || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      status: row.status,
      updated_at: row.updated_at ? Number(row.updated_at) : null,
      collection: collectionById[row.collection_id]
    }))

    return c.json({
      data: items,
      count: items.length
    })
  } catch (error) {
    console.error('Error fetching reference options:', error)
    return c.json({ error: 'Failed to fetch references' }, 500)
  }
})

export default adminApiRoutes
