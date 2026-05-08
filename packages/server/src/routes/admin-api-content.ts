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

export const adminApiContentRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminApiContentRoutes.use('*', requireAuth())
adminApiContentRoutes.use('*', requireRole(['admin', 'editor', 'author']))

async function getCollectionFieldsSimple(db: D1Database, collectionId: string) {
  const collectionRow = await db
    .prepare('SELECT schema FROM collections WHERE id = ?')
    .bind(collectionId)
    .first() as any

  if (collectionRow?.schema) {
    try {
      const schema = typeof collectionRow.schema === 'string' ? JSON.parse(collectionRow.schema) : collectionRow.schema
      if (schema?.properties) {
        let order = 0
        return Object.entries(schema.properties).map(([fieldName, fieldConfig]: [string, any]) => ({
          id: `schema-${fieldName}`,
          fieldName,
          fieldLabel: fieldConfig.title || fieldName,
          fieldType: fieldConfig.format || fieldConfig.type || 'text',
          fieldOptions: fieldConfig,
          fieldOrder: order++,
          isRequired: fieldConfig.required === true || (schema.required?.includes(fieldName) ?? false),
          isSearchable: false,
        }))
      }
    } catch { /* ignore */ }
  }

  const { results } = await db
    .prepare('SELECT * FROM content_fields WHERE collection_id = ? ORDER BY field_order ASC')
    .bind(collectionId)
    .all()

  return (results || []).map((row: any) => ({
    id: row.id,
    fieldName: row.field_name,
    fieldLabel: row.field_label,
    fieldType: row.field_type,
    fieldOptions: row.field_options ? JSON.parse(row.field_options) : {},
    fieldOrder: row.field_order,
    isRequired: row.is_required === 1,
    isSearchable: row.is_searchable === 1,
  }))
}

adminApiContentRoutes.get('/', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)

  const db = c.env.DB
  const page = Math.max(1, Number(c.req.query('page') || '1'))
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') || '20')))
  const offset = (page - 1) * limit
  const model = c.req.query('model') || ''
  const status = c.req.query('status') || ''
  const search = c.req.query('search') || ''

  const conditions: string[] = ["(col.source_type IS NULL OR col.source_type = 'user')"]
  const params: unknown[] = []

  if (status && status !== 'all') {
    conditions.push('c.status = ?')
    params.push(status)
  } else if (!status) {
    conditions.push("c.status != 'deleted'")
  }

  if (model) {
    conditions.push('col.name = ?')
    params.push(model)
  }

  if (search) {
    conditions.push('(c.title LIKE ? OR c.slug LIKE ?)')
    params.push(`%${search}%`, `%${search}%`)
  }

  const where = `WHERE ${conditions.join(' AND ')}`

  try {
    const countRes = await db
      .prepare(`SELECT COUNT(*) as count FROM content c JOIN collections col ON c.collection_id = col.id ${where}`)
      .bind(...params)
      .first() as any
    const total = countRes?.count || 0

    const { results } = await db
      .prepare(`
        SELECT c.id, c.title, c.slug, c.status, c.created_at, c.updated_at,
               col.name as collection_name, col.display_name as collection_display_name,
               u.first_name, u.last_name, u.email as author_email
        FROM content c
        JOIN collections col ON c.collection_id = col.id
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
      collectionName: row.collection_name,
      collectionDisplayName: row.collection_display_name,
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
        SELECT c.*, col.name as collection_name, col.display_name as collection_display_name,
               u.first_name, u.last_name, u.email as author_email
        FROM content c
        JOIN collections col ON c.collection_id = col.id
        LEFT JOIN users u ON c.author_id = u.id
        WHERE c.id = ?
      `)
      .bind(id)
      .first() as any

    if (!row) return c.json({ error: 'Content not found' }, 404)

    const fields = await getCollectionFieldsSimple(db, row.collection_id)

    const response: ContentDetailResponse = {
      id: row.id,
      title: row.title,
      slug: row.slug,
      status: row.status,
      data: JSON.parse(row.data || '{}'),
      collectionId: row.collection_id,
      collectionName: row.collection_name,
      collectionDisplayName: row.collection_display_name,
      fields,
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

  const { collectionId, title, slug: rawSlug, status, data } = parsed.data
  const db = c.env.DB

  try {
    const collection = await db
      .prepare('SELECT id FROM collections WHERE id = ? AND is_active = 1')
      .bind(collectionId)
      .first()
    if (!collection) return c.json({ error: 'Collection not found' }, 404)

    const slug = (rawSlug || title)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')

    const id = crypto.randomUUID()
    const now = Date.now()

    await db
      .prepare('INSERT INTO content (id, collection_id, slug, title, data, status, author_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, collectionId, slug, title, JSON.stringify({ ...data, title }), status, user.userId, now, now)
      .run()

    await db
      .prepare('INSERT INTO content_versions (id, content_id, version, data, author_id, created_at) VALUES (?, ?, 1, ?, ?, ?)')
      .bind(crypto.randomUUID(), id, JSON.stringify({ ...data, title }), user.userId, now)
      .run()

    const response: MutateContentResponse = { message: 'Content created successfully', id }
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
    const existing = await db
      .prepare('SELECT * FROM content WHERE id = ?')
      .bind(id)
      .first() as any
    if (!existing) return c.json({ error: 'Content not found' }, 404)

    const now = Date.now()
    const newTitle = parsed.data.title ?? existing.title
    const existingData = JSON.parse(existing.data || '{}')
    const newData = parsed.data.data ? { ...existingData, ...parsed.data.data, title: newTitle } : existingData
    const newSlug = parsed.data.slug
      ? parsed.data.slug.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
      : existing.slug
    const newStatus = parsed.data.status ?? existing.status

    await db
      .prepare('UPDATE content SET title = ?, slug = ?, data = ?, status = ?, updated_at = ? WHERE id = ?')
      .bind(newTitle, newSlug, JSON.stringify(newData), newStatus, now, id)
      .run()

    if (JSON.stringify(existingData) !== JSON.stringify(newData)) {
      const versionRes = await db
        .prepare('SELECT MAX(version) as max_version FROM content_versions WHERE content_id = ?')
        .bind(id)
        .first() as any
      const nextVersion = (versionRes?.max_version || 0) + 1
      await db
        .prepare('INSERT INTO content_versions (id, content_id, version, data, author_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), id, nextVersion, JSON.stringify(newData), user.userId, now)
        .run()
    }

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
  const db = c.env.DB

  try {
    const existing = await db.prepare('SELECT id FROM content WHERE id = ?').bind(id).first()
    if (!existing) return c.json({ error: 'Content not found' }, 404)

    await db
      .prepare("UPDATE content SET status = 'deleted', updated_at = ? WHERE id = ?")
      .bind(Date.now(), id)
      .run()

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
    const versionRow = await db
      .prepare('SELECT data FROM content_versions WHERE content_id = ? AND version = ?')
      .bind(id, version)
      .first() as any

    if (!versionRow) return c.json({ error: 'Version not found' }, 404)

    const data = JSON.parse(versionRow.data || '{}')
    const now = Date.now()

    const versionCountRes = await db
      .prepare('SELECT MAX(version) as max_version FROM content_versions WHERE content_id = ?')
      .bind(id)
      .first() as any
    const nextVersion = (versionCountRes?.max_version || 0) + 1

    await db
      .prepare('UPDATE content SET data = ?, title = ?, updated_at = ? WHERE id = ?')
      .bind(JSON.stringify(data), data.title || 'Untitled', now, id)
      .run()

    await db
      .prepare('INSERT INTO content_versions (id, content_id, version, data, author_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), id, nextVersion, JSON.stringify(data), user.userId, now)
      .run()

    return c.json({ message: `Restored to version ${version}` })
  } catch (error) {
    console.error('[admin-api-content] Error restoring version:', error)
    return c.json({ error: 'Failed to restore version' }, 500)
  }
})
