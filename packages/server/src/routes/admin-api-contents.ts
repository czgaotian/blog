import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware'
import {
  createContentSchema,
  updateContentSchema,
  type ContentDetailResponse,
  type ContentListResponse,
  type ContentVersionSnapshot,
  type ContentVersionsResponse,
  type MutateContentResponse,
} from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../app'
import {
  createContent,
  deleteContent,
  restoreContentVersion,
  updateContent,
} from '../services/contents-domain'

export const adminApiContentsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminApiContentsRoutes.use('*', requireAuth())
adminApiContentsRoutes.use('*', requireRole(['admin', 'editor', 'author']))

adminApiContentsRoutes.get('/', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)

  const db = c.env.DB
  const page = Math.max(1, Number(c.req.query('page') || '1'))
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') || '20')))
  const offset = (page - 1) * limit
  const status = c.req.query('status') || ''
  const categoryId = c.req.query('categoryId') || ''
  const tagId = c.req.query('tagId') || ''
  const search = c.req.query('search') || ''

  const conditions: string[] = []
  const params: unknown[] = []

  if (status && status !== 'all') {
    conditions.push('c.status = ?')
    params.push(status)
  } else if (!status) {
    conditions.push("c.status != 'deleted'")
  }

  if (categoryId) {
    conditions.push('c.category_id = ?')
    params.push(categoryId)
  }

  if (tagId) {
    conditions.push('EXISTS (SELECT 1 FROM content_tags ct WHERE ct.content_id = c.id AND ct.tag_id = ?)')
    params.push(tagId)
  }

  if (search) {
    conditions.push('(c.title LIKE ? OR c.slug LIKE ? OR c.excerpt LIKE ?)')
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
    const countRes = await db
      .prepare(`SELECT COUNT(*) as count FROM contents c ${where}`)
      .bind(...params)
      .first() as any
    const total = countRes?.count || 0

    const { results } = await db
      .prepare(`
        SELECT c.id, c.title, c.slug, c.excerpt, c.status, c.cover_image_id, c.created_at, c.updated_at,
               cat.id AS category_id, cat.name AS category_name, cat.slug AS category_slug,
               u.first_name, u.last_name, u.email as author_email
        FROM contents c
        LEFT JOIN categories cat ON c.category_id = cat.id
        LEFT JOIN users u ON c.author_id = u.id
        ${where}
        ORDER BY c.updated_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(...params, limit, offset)
      .all()

    const ids = (results || []).map((row: any) => row.id)
    const tagsByContent = await getTagsByContentIds(db, ids)
    const items = (results || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt ?? null,
      status: row.status,
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_slug,
      } : null,
      coverImageId: row.cover_image_id ?? null,
      tags: tagsByContent.get(row.id) ?? [],
      authorName: row.first_name && row.last_name
        ? `${row.first_name} ${row.last_name}`
        : row.author_email || 'Unknown',
      createdAt: new Date(Number(row.created_at)).toISOString(),
      updatedAt: new Date(Number(row.updated_at)).toISOString(),
    }))

    const response: ContentListResponse = { items, total, page, limit }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-contents] Error fetching content:', error)
    return c.json({ error: 'Failed to fetch content' }, 500)
  }
})

adminApiContentsRoutes.get('/:id', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)
  const id = c.req.param('id')
  const db = c.env.DB

  try {
    const row = await db
      .prepare(`
        SELECT c.*, cat.name AS category_name, cat.slug AS category_slug,
               u.first_name, u.last_name, u.email as author_email
        FROM contents c
        LEFT JOIN categories cat ON c.category_id = cat.id
        LEFT JOIN users u ON c.author_id = u.id
        WHERE c.id = ?
      `)
      .bind(id)
      .first() as any

    if (!row) return c.json({ error: 'Content not found' }, 404)

    const tags = await getContentTags(db, id)
    const response: ContentDetailResponse = {
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt ?? null,
      bodyJson: parseTiptapDocument(row.body_json),
      bodyHtml: row.body_html ?? '',
      status: row.status,
      categoryId: row.category_id ?? null,
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_slug,
      } : null,
      coverImageId: row.cover_image_id ?? null,
      tags,
      tagIds: tags.map((tag) => tag.id),
      metadata: parseJsonObject(row.metadata),
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
    console.error('[admin-api-contents] Error fetching content item:', error)
    return c.json({ error: 'Failed to fetch content' }, 500)
  }
})

adminApiContentsRoutes.post('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Authentication required' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

  const parsed = createContentSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 422)

  const db = c.env.DB

  try {
    const result = await createContent({
      db,
      mode: 'admin-create',
      input: parsed.data,
      authorId: user.userId,
      cacheKv: c.env.CACHE_KV,
    })
    if (result.validationError) return c.json({ error: result.validationError }, 422)
    if (result.duplicateSlug) return c.json({ error: 'Slug already exists' }, 409)

    const response: MutateContentResponse = { message: 'Content created successfully', id: result.id! }
    return c.json(response, 201)
  } catch (error) {
    console.error('[admin-api-contents] Error creating content:', error)
    return c.json({ error: 'Failed to create content' }, 500)
  }
})

adminApiContentsRoutes.put('/:id', async (c) => {
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
    if (result.validationError) return c.json({ error: result.validationError }, 422)
    if (result.duplicateSlug) return c.json({ error: 'Slug already exists' }, 409)

    return c.json({ message: 'Content updated successfully' })
  } catch (error) {
    console.error('[admin-api-contents] Error updating content:', error)
    return c.json({ error: 'Failed to update content' }, 500)
  }
})

adminApiContentsRoutes.delete('/:id', async (c) => {
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
    console.error('[admin-api-contents] Error deleting content:', error)
    return c.json({ error: 'Failed to delete content' }, 500)
  }
})

adminApiContentsRoutes.get('/:id/versions', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)
  const id = c.req.param('id')
  const db = c.env.DB

  try {
    const existing = await db.prepare('SELECT id FROM contents WHERE id = ?').bind(id).first()
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
      data: parseVersionSnapshot(row.data),
      authorName: row.first_name && row.last_name
        ? `${row.first_name} ${row.last_name}`
        : row.email || 'Unknown',
      createdAt: new Date(Number(row.created_at)).toISOString(),
      isCurrent: i === 0,
    }))

    const response: ContentVersionsResponse = { versions }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-contents] Error fetching versions:', error)
    return c.json({ error: 'Failed to fetch versions' }, 500)
  }
})

adminApiContentsRoutes.post('/:id/restore/:version', async (c) => {
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
    if (!result.restored && result.validationError) return c.json({ error: result.validationError }, 422)
    if (!result.restored) return c.json({ error: 'Version not found' }, 404)

    return c.json({ message: `Restored to version ${version}` })
  } catch (error) {
    console.error('[admin-api-contents] Error restoring version:', error)
    return c.json({ error: 'Failed to restore version' }, 500)
  }
})

async function getContentTags(db: D1Database, contentId: string) {
  const { results } = await db
    .prepare(`
      SELECT t.id, t.name, t.slug
      FROM content_tags ct
      JOIN tags t ON ct.tag_id = t.id
      WHERE ct.content_id = ?
      ORDER BY t.name ASC
    `)
    .bind(contentId)
    .all()

  return (results || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
  }))
}

async function getTagsByContentIds(db: D1Database, contentIds: string[]) {
  const tagsByContent = new Map<string, Array<{ id: string; name: string; slug: string }>>()
  if (contentIds.length === 0) return tagsByContent

  const placeholders = contentIds.map(() => '?').join(',')
  const { results } = await db
    .prepare(`
      SELECT ct.content_id, t.id, t.name, t.slug
      FROM content_tags ct
      JOIN tags t ON ct.tag_id = t.id
      WHERE ct.content_id IN (${placeholders})
      ORDER BY t.name ASC
    `)
    .bind(...contentIds)
    .all()

  for (const row of results || []) {
    const item = { id: (row as any).id, name: (row as any).name, slug: (row as any).slug }
    const contentId = String((row as any).content_id)
    tagsByContent.set(contentId, [...(tagsByContent.get(contentId) ?? []), item])
  }

  return tagsByContent
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object') return value as Record<string, unknown>
  if (!value) return {}
  try {
    const parsed = JSON.parse(String(value))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function parseVersionSnapshot(value: unknown): ContentVersionSnapshot {
  const snapshot = parseJsonObject(value)
  const { type: _legacyType, ...contentSnapshot } = snapshot
  return {
    ...contentSnapshot,
    bodyJson: parseTiptapDocument(contentSnapshot.bodyJson),
    coverImageId: contentSnapshot.coverImageId ?? null,
  } as unknown as ContentVersionSnapshot
}

function parseTiptapDocument(value: unknown) {
  if (value && typeof value === 'object' && (value as { type?: unknown }).type === 'doc') return value
  if (!value) return { type: 'doc', content: [] }
  try {
    const parsed = JSON.parse(String(value))
    return parsed && typeof parsed === 'object' && parsed.type === 'doc'
      ? parsed
      : { type: 'doc', content: [] }
  } catch {
    return { type: 'doc', content: [] }
  }
}
