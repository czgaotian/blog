import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware'
import {
  createContentSchema,
  updateContentSchema,
  type ContentListResponse,
  type ContentDetailResponse,
  type ContentVersionsResponse,
  type MutateContentResponse,
} from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../app'
import {
  createContent,
  deleteContent,
  restoreContentVersion,
  updateContent,
} from '../services/content-domain'

export const adminApiContentRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminApiContentRoutes.use('*', requireAuth())
adminApiContentRoutes.use('*', requireRole(['admin', 'editor', 'author']))

adminApiContentRoutes.get('/', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)

  const db = c.env.DB
  const page = Math.max(1, Number(c.req.query('page') || '1'))
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') || '20')))
  const offset = (page - 1) * limit
  const status = c.req.query('status') || ''
  const search = c.req.query('search') || ''

  const conditions: string[] = []
  const params: unknown[] = []

  if (status && status !== 'all') {
    conditions.push('c.status = ?')
    params.push(status)
  } else if (!status) {
    conditions.push("c.status != 'deleted'")
  }

  if (search) {
    conditions.push('(c.title LIKE ? OR c.slug LIKE ?)')
    params.push(`%${search}%`, `%${search}%`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
    const countRes = await db
      .prepare(`SELECT COUNT(*) as count FROM content c ${where}`)
      .bind(...params)
      .first() as any
    const total = countRes?.count || 0

    const { results } = await db
      .prepare(`
        SELECT c.id, c.title, c.slug, c.status, c.created_at, c.updated_at,
               u.first_name, u.last_name, u.email as author_email
        FROM content c
        LEFT JOIN users u ON c.author_id = u.id
        ${where}
        ORDER BY c.updated_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(...params, limit, offset)
      .all()

    const items = (results || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      status: row.status,
      authorName: row.first_name && row.last_name
        ? `${row.first_name} ${row.last_name}`
        : row.author_email || 'Unknown',
      createdAt: new Date(Number(row.created_at)).toISOString(),
      updatedAt: new Date(Number(row.updated_at)).toISOString(),
    }))

    const response: ContentListResponse = { items, total, page, limit }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-content] Error fetching content:', error)
    return c.json({ error: 'Failed to fetch content' }, 500)
  }
})

adminApiContentRoutes.get('/:id', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)
  const id = c.req.param('id')
  const db = c.env.DB

  try {
    const row = await db
      .prepare(`
        SELECT c.*, u.first_name, u.last_name, u.email as author_email
        FROM content c
        LEFT JOIN users u ON c.author_id = u.id
        WHERE c.id = ?
      `)
      .bind(id)
      .first() as any

    if (!row) return c.json({ error: 'Content not found' }, 404)

    const response: ContentDetailResponse = {
      id: row.id,
      title: row.title,
      slug: row.slug,
      status: row.status,
      publishedAt: row.published_at ? new Date(Number(row.published_at)).toISOString() : null,
      authorId: row.author_id,
      authorName: row.first_name && row.last_name
        ? `${row.first_name} ${row.last_name}`
        : row.author_email || 'Unknown',
      createdAt: new Date(Number(row.created_at)).toISOString(),
      updatedAt: new Date(Number(row.updated_at)).toISOString(),
    }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-content] Error fetching content item:', error)
    return c.json({ error: 'Failed to fetch content' }, 500)
  }
})

adminApiContentRoutes.post('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Authentication required' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

  const parsed = createContentSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 422)

  const { title, slug: rawSlug, status, publishedAt } = parsed.data
  const db = c.env.DB

  try {
    const result = await createContent({
      db,
      mode: 'admin-create',
      input: {
        title,
        slug: rawSlug,
        status,
        publishedAt,
      },
      authorId: user.userId,
      cacheKv: c.env.CACHE_KV,
    })
    if (result.duplicateSlug) return c.json({ error: 'Slug already exists' }, 409)

    const response: MutateContentResponse = { message: 'Content created successfully', id: result.id! }
    return c.json(response, 201)
  } catch (error) {
    console.error('[admin-api-content] Error creating content:', error)
    return c.json({ error: 'Failed to create content' }, 500)
  }
})

adminApiContentRoutes.put('/:id', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Authentication required' }, 401)
  const id = c.req.param('id')

  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

  const parsed = updateContentSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 422)

  const db = c.env.DB

  try {
    const result = await updateContent({
      db,
      id,
      mode: 'admin-update',
      patch: parsed.data,
      authorId: user.userId,
      cacheKv: c.env.CACHE_KV,
    })
    if (!result.found) return c.json({ error: 'Content not found' }, 404)
    if (result.duplicateSlug) return c.json({ error: 'Slug already exists' }, 409)

    return c.json({ message: 'Content updated successfully' })
  } catch (error) {
    console.error('[admin-api-content] Error updating content:', error)
    return c.json({ error: 'Failed to update content' }, 500)
  }
})

adminApiContentRoutes.delete('/:id', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Authentication required' }, 401)
  const id = c.req.param('id')
  if (!id) return c.json({ error: 'Content id is required' }, 400)
  const db = c.env.DB

  try {
    const result = await deleteContent({
      db,
      id,
      mode: 'admin-soft',
      cacheKv: c.env.CACHE_KV,
    })
    if (!result.found) return c.json({ error: 'Content not found' }, 404)

    return c.json({ message: 'Content deleted successfully' })
  } catch (error) {
    console.error('[admin-api-content] Error deleting content:', error)
    return c.json({ error: 'Failed to delete content' }, 500)
  }
})

adminApiContentRoutes.get('/:id/versions', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)
  const id = c.req.param('id')
  const db = c.env.DB

  try {
    const existing = await db.prepare('SELECT id FROM content WHERE id = ?').bind(id).first()
    if (!existing) return c.json({ error: 'Content not found' }, 404)

    const { results } = await db
      .prepare(`
        SELECT cv.id, cv.version, cv.data, cv.author_id, cv.created_at,
               u.first_name, u.last_name, u.email
        FROM content_versions cv
        LEFT JOIN users u ON cv.author_id = u.id
        WHERE cv.content_id = ?
        ORDER BY cv.version DESC
      `)
      .bind(id)
      .all()

    const versions = (results || []).map((row: any, i: number) => ({
      id: row.id,
      version: row.version,
      data: JSON.parse(row.data || '{}'),
      authorName: row.first_name && row.last_name
        ? `${row.first_name} ${row.last_name}`
        : row.email || 'Unknown',
      createdAt: new Date(Number(row.created_at)).toISOString(),
      isCurrent: i === 0,
    }))

    const response: ContentVersionsResponse = { versions }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-content] Error fetching versions:', error)
    return c.json({ error: 'Failed to fetch versions' }, 500)
  }
})

adminApiContentRoutes.post('/:id/restore/:version', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Authentication required' }, 401)
  const id = c.req.param('id')
  const version = Number(c.req.param('version'))
  const db = c.env.DB

  try {
    const result = await restoreContentVersion({
      db,
      id,
      version,
      authorId: user.userId,
      cacheKv: c.env.CACHE_KV,
    })
    if (!result.restored) return c.json({ error: 'Version not found' }, 404)

    return c.json({ message: `Restored to version ${version}` })
  } catch (error) {
    console.error('[admin-api-content] Error restoring version:', error)
    return c.json({ error: 'Failed to restore version' }, 500)
  }
})
