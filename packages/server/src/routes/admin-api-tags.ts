import { Hono } from 'hono'
import {
  createTagSchema,
  updateTagSchema,
  type MutateTagResponse,
  type TagDetailResponse,
  type TagListResponse,
} from '@worker-blog/shared/admin-api'
import { requireAuth, requireRole } from '../middleware'
import type { Bindings, Variables } from '../app'
import { createTag, deleteTag, updateTag } from '../services/tag-domain'

export const adminApiTagsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminApiTagsRoutes.use('*', requireAuth())
adminApiTagsRoutes.use('*', requireRole(['admin', 'editor', 'author']))

adminApiTagsRoutes.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM tags ORDER BY name ASC').all()
  const items = (results || []).map(mapTag)
  const response: TagListResponse = { items, total: items.length }
  return c.json(response)
})

adminApiTagsRoutes.get('/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM tags WHERE id = ?').bind(c.req.param('id')).first()
  if (!row) return c.json({ error: 'Tag not found' }, 404)
  return c.json(mapTag(row) satisfies TagDetailResponse)
})

adminApiTagsRoutes.post('/', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

  const parsed = createTagSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 422)

  const result = await createTag(c.env.DB, parsed.data)
  if (!result.ok) return tagError(c, result.reason)

  const response: MutateTagResponse = { message: 'Tag created successfully', id: result.id }
  return c.json(response, 201)
})

adminApiTagsRoutes.put('/:id', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

  const parsed = updateTagSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 422)

  const result = await updateTag(c.env.DB, c.req.param('id'), parsed.data)
  if (!result.ok) return tagError(c, result.reason)

  return c.json({ message: 'Tag updated successfully' } satisfies MutateTagResponse)
})

adminApiTagsRoutes.delete('/:id', async (c) => {
  const result = await deleteTag(c.env.DB, c.req.param('id'))
  if (!result.ok) return tagError(c, result.reason)
  return c.json({ message: 'Tag deleted successfully' } satisfies MutateTagResponse)
})

function mapTag(row: any): TagDetailResponse {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    createdAt: new Date(Number(row.created_at)).toISOString(),
    updatedAt: new Date(Number(row.updated_at)).toISOString(),
  }
}

function tagError(c: any, reason?: string) {
  if (reason === 'not_found') return c.json({ error: 'Tag not found' }, 404)
  if (reason === 'duplicate_slug') return c.json({ error: 'Tag slug already exists' }, 409)
  if (reason === 'in_use') return c.json({ error: 'Tag is in use' }, 409)
  return c.json({ error: 'Failed to mutate tag' }, 500)
}
