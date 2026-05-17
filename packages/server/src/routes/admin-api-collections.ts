import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware'
import {
  createCollectionSchema,
  updateCollectionSchema,
  createFieldSchema,
  updateFieldSchema,
  type CollectionsListResponse,
  type CollectionDetailResponse,
  type CollectionField,
  type MutateCollectionResponse,
} from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../app'
import { deleteCollection, invalidateCollectionCache } from '../services/collection-domain'

const reorderSchema = z.object({ fieldIds: z.array(z.string()) })

export const adminApiCollectionsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminApiCollectionsRoutes.use('*', requireAuth())
adminApiCollectionsRoutes.use('*', requireRole(['admin', 'editor']))
adminApiCollectionsRoutes.post('*', requireRole(['admin']))
adminApiCollectionsRoutes.put('*', requireRole(['admin']))
adminApiCollectionsRoutes.delete('*', requireRole(['admin']))
adminApiCollectionsRoutes.patch('*', requireRole(['admin']))

function mapField(row: any): CollectionField {
  return {
    id: row.id,
    fieldName: row.field_name,
    fieldLabel: row.field_label,
    fieldType: row.field_type,
    fieldOptions: row.field_options ? JSON.parse(row.field_options) : {},
    fieldOrder: row.field_order,
    isRequired: Boolean(row.is_required),
    isSearchable: Boolean(row.is_searchable),
  }
}

function schemaToFields(schema: any): CollectionField[] {
  if (!schema?.properties) return []
  let order = 0
  return Object.entries(schema.properties).map(([fieldName, cfg]: [string, any]) => ({
    id: `schema-${fieldName}`,
    fieldName,
    fieldLabel: cfg.title || fieldName,
    fieldType: cfg.format || cfg.type || 'text',
    fieldOptions: cfg,
    fieldOrder: order++,
    isRequired: cfg.required === true || (Array.isArray(schema.required) && schema.required.includes(fieldName)),
    isSearchable: Boolean(cfg.searchable),
  }))
}

async function getFields(db: any, collectionId: string, schema: any): Promise<CollectionField[]> {
  if (schema?.properties && Object.keys(schema.properties).length > 0) {
    return schemaToFields(schema)
  }
  const { results } = await db
    .prepare('SELECT * FROM content_fields WHERE collection_id = ? ORDER BY field_order ASC')
    .bind(collectionId)
    .all()
  return (results || []).map(mapField)
}

// GET /
adminApiCollectionsRoutes.get('/', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)
  const db = c.env.DB
  const search = c.req.query('search') || ''

  try {
    const conditions = ["(source_type IS NULL OR source_type = 'user')"]
    const params: unknown[] = []
    if (search) {
      conditions.push('(name LIKE ? OR display_name LIKE ?)')
      params.push(`%${search}%`, `%${search}%`)
    }
    const where = `WHERE ${conditions.join(' AND ')}`

    const { results } = await db
      .prepare(`SELECT id, name, display_name, description, is_active, managed, created_at, updated_at FROM collections ${where} ORDER BY created_at DESC`)
      .bind(...params)
      .all()

    const { results: fieldCountResults } = await db
      .prepare('SELECT collection_id, COUNT(*) as count FROM content_fields GROUP BY collection_id')
      .all()
    const fieldCounts = new Map((fieldCountResults || []).map((r: any) => [String(r.collection_id), Number(r.count)]))

    const collections = (results || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description ?? null,
      isActive: Boolean(row.is_active),
      managed: Boolean(row.managed),
      fieldCount: fieldCounts.get(String(row.id)) || 0,
      createdAt: new Date(Number(row.created_at)).toISOString(),
      updatedAt: new Date(Number(row.updated_at)).toISOString(),
    }))

    const response: CollectionsListResponse = { collections, total: collections.length }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-collections] Error fetching collections:', error)
    return c.json({ error: 'Failed to fetch collections' }, 500)
  }
})

// GET /:id
adminApiCollectionsRoutes.get('/:id', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)
  const id = c.req.param('id')
  const db = c.env.DB

  try {
    const row = await db.prepare('SELECT * FROM collections WHERE id = ?').bind(id).first() as any
    if (!row) return c.json({ error: 'Collection not found' }, 404)

    const schema = row.schema ? (typeof row.schema === 'string' ? JSON.parse(row.schema) : row.schema) : null
    const fields = await getFields(db, id, schema)

    const response: CollectionDetailResponse = {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description ?? null,
      isActive: Boolean(row.is_active),
      managed: Boolean(row.managed),
      fields,
      createdAt: new Date(Number(row.created_at)).toISOString(),
      updatedAt: new Date(Number(row.updated_at)).toISOString(),
    }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-collections] Error fetching collection:', error)
    return c.json({ error: 'Failed to fetch collection' }, 500)
  }
})

// POST /
adminApiCollectionsRoutes.post('/', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

  const parsed = createCollectionSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 422)

  const db = c.env.DB
  try {
    const existing = await db.prepare('SELECT id FROM collections WHERE name = ?').bind(parsed.data.name).first()
    if (existing) return c.json({ error: 'A collection with this name already exists' }, 409)

    const id = crypto.randomUUID()
    const now = Date.now()
    const schema = { type: 'object', properties: {}, required: [] }

    await db
      .prepare('INSERT INTO collections (id, name, display_name, description, schema, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)')
      .bind(id, parsed.data.name, parsed.data.displayName, parsed.data.description ?? null, JSON.stringify(schema), now, now)
      .run()

    await invalidateCollectionCache(c.env.CACHE_KV, parsed.data.name)

    const response: MutateCollectionResponse = { message: 'Collection created successfully', id }
    return c.json(response, 201)
  } catch (error) {
    console.error('[admin-api-collections] Error creating collection:', error)
    return c.json({ error: 'Failed to create collection' }, 500)
  }
})

// PATCH /:id
adminApiCollectionsRoutes.patch('/:id', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)
  const id = c.req.param('id')

  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

  const parsed = updateCollectionSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 422)

  const db = c.env.DB
  try {
    const existing = await db.prepare('SELECT name FROM collections WHERE id = ?').bind(id).first() as any
    if (!existing) return c.json({ error: 'Collection not found' }, 404)

    const fields: string[] = []
    const vals: unknown[] = []
    if (parsed.data.displayName !== undefined) { fields.push('display_name = ?'); vals.push(parsed.data.displayName) }
    if (parsed.data.description !== undefined) { fields.push('description = ?'); vals.push(parsed.data.description) }
    if (parsed.data.isActive !== undefined) { fields.push('is_active = ?'); vals.push(parsed.data.isActive ? 1 : 0) }
    if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400)

    fields.push('updated_at = ?')
    vals.push(Date.now(), id)
    await db.prepare(`UPDATE collections SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run()

    await invalidateCollectionCache(c.env.CACHE_KV, existing.name)

    const response: MutateCollectionResponse = { message: 'Collection updated successfully' }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-collections] Error updating collection:', error)
    return c.json({ error: 'Failed to update collection' }, 500)
  }
})

// DELETE /:id
adminApiCollectionsRoutes.delete('/:id', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)
  const id = c.req.param('id')
  const db = c.env.DB

  try {
    const result = await deleteCollection({
      db,
      id,
      cacheKv: c.env.CACHE_KV,
    })
    if (!result.deleted && result.reason === 'not_found') return c.json({ error: 'Collection not found' }, 404)
    if (!result.deleted && result.reason === 'managed') return c.json({ error: 'Cannot delete a managed collection' }, 400)
    if (!result.deleted && result.reason === 'has_content') {
      return c.json({ error: `Cannot delete collection: it has ${result.count} content items` }, 400)
    }

    const response: MutateCollectionResponse = { message: 'Collection deleted successfully' }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-collections] Error deleting collection:', error)
    return c.json({ error: 'Failed to delete collection' }, 500)
  }
})

// POST /:id/fields
adminApiCollectionsRoutes.post('/:id/fields', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)
  const collectionId = c.req.param('id')

  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

  const parsed = createFieldSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 422)

  const db = c.env.DB
  try {
    const row = await db.prepare('SELECT * FROM collections WHERE id = ?').bind(collectionId).first() as any
    if (!row) return c.json({ error: 'Collection not found' }, 404)

    const schema = row.schema ? (typeof row.schema === 'string' ? JSON.parse(row.schema) : row.schema) : { type: 'object', properties: {}, required: [] }
    if (!schema.properties) schema.properties = {}
    if (!schema.required) schema.required = []

    if (schema.properties[parsed.data.fieldName]) {
      return c.json({ error: 'A field with this name already exists' }, 409)
    }

    const fieldConfig: Record<string, unknown> = {
      type: parsed.data.fieldType === 'number' ? 'number' : parsed.data.fieldType === 'boolean' ? 'boolean' : 'string',
      title: parsed.data.fieldLabel,
      searchable: parsed.data.isSearchable,
      ...parsed.data.fieldOptions,
    }
    if (['richtext', 'quill', 'markdown', 'date', 'slug', 'media', 'reference'].includes(parsed.data.fieldType)) {
      fieldConfig.format = parsed.data.fieldType
    }

    schema.properties[parsed.data.fieldName] = fieldConfig
    if (parsed.data.isRequired && !schema.required.includes(parsed.data.fieldName)) {
      schema.required.push(parsed.data.fieldName)
    }

    await db.prepare('UPDATE collections SET schema = ?, updated_at = ? WHERE id = ?')
      .bind(JSON.stringify(schema), Date.now(), collectionId).run()

    await invalidateCollectionCache(c.env.CACHE_KV, row.name)

    return c.json({ message: 'Field added successfully', id: `schema-${parsed.data.fieldName}` }, 201)
  } catch (error) {
    console.error('[admin-api-collections] Error adding field:', error)
    return c.json({ error: 'Failed to add field' }, 500)
  }
})

// PUT /:id/fields/:fieldId
adminApiCollectionsRoutes.put('/:id/fields/:fieldId', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)
  const collectionId = c.req.param('id')
  const fieldId = c.req.param('fieldId')

  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

  const parsed = updateFieldSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 422)

  const db = c.env.DB
  try {
    const row = await db.prepare('SELECT * FROM collections WHERE id = ?').bind(collectionId).first() as any
    if (!row) return c.json({ error: 'Collection not found' }, 404)

    if (fieldId.startsWith('schema-')) {
      const fieldName = fieldId.replace('schema-', '')
      const schema = row.schema ? (typeof row.schema === 'string' ? JSON.parse(row.schema) : row.schema) : { type: 'object', properties: {}, required: [] }
      if (!schema.properties?.[fieldName]) return c.json({ error: 'Field not found' }, 404)
      if (!schema.required) schema.required = []

      const existing = schema.properties[fieldName]
      const updated: Record<string, unknown> = {
        ...existing,
        ...(parsed.data.fieldOptions ?? {}),
        title: parsed.data.fieldLabel ?? existing.title,
        searchable: parsed.data.isSearchable ?? existing.searchable,
      }
      if (parsed.data.fieldType !== undefined) {
        updated.type = parsed.data.fieldType === 'number' ? 'number' : parsed.data.fieldType === 'boolean' ? 'boolean' : 'string'
        if (['richtext', 'quill', 'markdown', 'date', 'slug', 'media', 'reference'].includes(parsed.data.fieldType)) {
          updated.format = parsed.data.fieldType
        }
      }
      if (parsed.data.fieldType !== undefined && !['richtext', 'quill', 'markdown', 'date', 'slug', 'media', 'reference'].includes(parsed.data.fieldType)) {
        delete updated.format
      }
      schema.properties[fieldName] = updated

      const idx = schema.required.indexOf(fieldName)
      if (parsed.data.isRequired === true && idx === -1) schema.required.push(fieldName)
      else if (parsed.data.isRequired === false && idx !== -1) schema.required.splice(idx, 1)

      await db.prepare('UPDATE collections SET schema = ?, updated_at = ? WHERE id = ?')
        .bind(JSON.stringify(schema), Date.now(), collectionId).run()
      await invalidateCollectionCache(c.env.CACHE_KV, row.name)
      return c.json({ message: 'Field updated successfully' })
    }

    // legacy content_fields row
    const existing = await db.prepare('SELECT id FROM content_fields WHERE id = ? AND collection_id = ?').bind(fieldId, collectionId).first()
    if (!existing) return c.json({ error: 'Field not found' }, 404)

    const updates: string[] = []
    const vals: unknown[] = []
    if (parsed.data.fieldLabel !== undefined) { updates.push('field_label = ?'); vals.push(parsed.data.fieldLabel) }
    if (parsed.data.fieldType !== undefined) { updates.push('field_type = ?'); vals.push(parsed.data.fieldType) }
    if (parsed.data.isRequired !== undefined) { updates.push('is_required = ?'); vals.push(parsed.data.isRequired ? 1 : 0) }
    if (parsed.data.isSearchable !== undefined) { updates.push('is_searchable = ?'); vals.push(parsed.data.isSearchable ? 1 : 0) }
    if (parsed.data.fieldOptions !== undefined) { updates.push('field_options = ?'); vals.push(JSON.stringify(parsed.data.fieldOptions)) }
    if (updates.length === 0) return c.json({ error: 'No fields to update' }, 400)
    updates.push('updated_at = ?')
    vals.push(Date.now(), fieldId)
    await db.prepare(`UPDATE content_fields SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run()
    await invalidateCollectionCache(c.env.CACHE_KV, row.name)
    return c.json({ message: 'Field updated successfully' })
  } catch (error) {
    console.error('[admin-api-collections] Error updating field:', error)
    return c.json({ error: 'Failed to update field' }, 500)
  }
})

// DELETE /:id/fields/:fieldId
adminApiCollectionsRoutes.delete('/:id/fields/:fieldId', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)
  const collectionId = c.req.param('id')
  const fieldId = c.req.param('fieldId')
  const db = c.env.DB

  try {
    if (fieldId.startsWith('schema-')) {
      const fieldName = fieldId.replace('schema-', '')
      const row = await db.prepare('SELECT * FROM collections WHERE id = ?').bind(collectionId).first() as any
      if (!row) return c.json({ error: 'Collection not found' }, 404)
      const schema = row.schema ? (typeof row.schema === 'string' ? JSON.parse(row.schema) : row.schema) : null
      if (!schema?.properties?.[fieldName]) return c.json({ error: 'Field not found' }, 404)
      delete schema.properties[fieldName]
      if (Array.isArray(schema.required)) {
        const idx = schema.required.indexOf(fieldName)
        if (idx !== -1) schema.required.splice(idx, 1)
      }
      await db.prepare('UPDATE collections SET schema = ?, updated_at = ? WHERE id = ?')
        .bind(JSON.stringify(schema), Date.now(), collectionId).run()
      await invalidateCollectionCache(c.env.CACHE_KV, row.name)
      return c.json({ message: 'Field deleted successfully' })
    }
    const fieldRow = await db.prepare('SELECT id FROM content_fields WHERE id = ? AND collection_id = ?').bind(fieldId, collectionId).first()
    if (!fieldRow) return c.json({ error: 'Field not found' }, 404)
    await db.prepare('DELETE FROM content_fields WHERE id = ?').bind(fieldId).run()
    try {
      const collRow = await db.prepare('SELECT name FROM collections WHERE id = ?').bind(collectionId).first() as any
      if (collRow) await invalidateCollectionCache(c.env.CACHE_KV, collRow.name)
    } catch { /* ignore */ }
    return c.json({ message: 'Field deleted successfully' })
  } catch (error) {
    console.error('[admin-api-collections] Error deleting field:', error)
    return c.json({ error: 'Failed to delete field' }, 500)
  }
})

// POST /:id/fields/reorder
adminApiCollectionsRoutes.post('/:id/fields/reorder', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)
  const collectionId = c.req.param('id')

  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

  const parsed = reorderSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'fieldIds array required' }, 400)

  const db = c.env.DB
  try {
    const { results: validRows } = await db
      .prepare('SELECT id FROM content_fields WHERE collection_id = ?')
      .bind(collectionId)
      .all()
    const validIds = new Set((validRows || []).map((r: any) => String(r.id)))
    const safeFieldIds = parsed.data.fieldIds.filter((id) => validIds.has(id))

    for (let i = 0; i < safeFieldIds.length; i++) {
      await db.prepare('UPDATE content_fields SET field_order = ?, updated_at = ? WHERE id = ?')
        .bind(i + 1, Date.now(), safeFieldIds[i]).run()
    }
    const collRow = await db.prepare('SELECT name FROM collections WHERE id = ?').bind(collectionId).first() as any
    if (collRow) await invalidateCollectionCache(c.env.CACHE_KV, collRow.name)
    return c.json({ message: 'Fields reordered successfully' })
  } catch (error) {
    console.error('[admin-api-collections] Error reordering fields:', error)
    return c.json({ error: 'Failed to reorder fields' }, 500)
  }
})
