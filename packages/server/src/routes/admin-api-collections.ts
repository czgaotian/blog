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
import {
  addCollectionField,
  createCollection,
  deleteCollection,
  deleteCollectionField,
  invalidateCollectionCache,
  reorderCollectionFields,
  updateCollection,
  updateCollectionField,
} from '../services/collection-domain'

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
    const conditions: string[] = []
    const params: unknown[] = []
    if (search) {
      conditions.push('(name LIKE ? OR display_name LIKE ?)')
      params.push(`%${search}%`, `%${search}%`)
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

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
    const result = await createCollection({
      db,
      input: {
        name: parsed.data.name,
        displayName: parsed.data.displayName,
        description: parsed.data.description ?? null,
      },
      cacheKv: c.env.CACHE_KV,
    })
    if (!result.created && result.reason === 'duplicate') {
      return c.json({ error: 'A collection with this name already exists' }, 409)
    }
    if (!result.created) {
      return c.json({ error: 'Failed to create collection' }, 500)
    }

    const response: MutateCollectionResponse = { message: 'Collection created successfully', id: result.id }
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
    const result = await updateCollection({
      db,
      id,
      input: parsed.data,
      cacheKv: c.env.CACHE_KV,
    })
    if (!result.updated && result.reason === 'not_found') return c.json({ error: 'Collection not found' }, 404)
    if (!result.updated && result.reason === 'no_fields') return c.json({ error: 'No fields to update' }, 400)

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
    const result = await addCollectionField({
      db,
      collectionId,
      input: parsed.data,
      cacheKv: c.env.CACHE_KV,
    })
    if (!result.added && result.reason === 'collection_not_found') return c.json({ error: 'Collection not found' }, 404)
    if (!result.added && result.reason === 'duplicate_field') {
      return c.json({ error: 'A field with this name already exists' }, 409)
    }
    if (!result.added) return c.json({ error: 'Failed to add field' }, 500)

    return c.json({ message: 'Field added successfully', id: result.id }, 201)
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
    const result = await updateCollectionField({
      db,
      collectionId,
      fieldId,
      input: parsed.data,
      cacheKv: c.env.CACHE_KV,
    })
    if (!result.updated && result.reason === 'collection_not_found') return c.json({ error: 'Collection not found' }, 404)
    if (!result.updated && result.reason === 'field_not_found') return c.json({ error: 'Field not found' }, 404)
    if (!result.updated && result.reason === 'no_fields') return c.json({ error: 'No fields to update' }, 400)
    if (!result.updated) return c.json({ error: 'Failed to update field' }, 500)

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
    const result = await deleteCollectionField({
      db,
      collectionId,
      fieldId,
      cacheKv: c.env.CACHE_KV,
    })
    if (!result.deleted && result.reason === 'collection_not_found') return c.json({ error: 'Collection not found' }, 404)
    if (!result.deleted && result.reason === 'field_not_found') return c.json({ error: 'Field not found' }, 404)
    if (!result.deleted) return c.json({ error: 'Failed to delete field' }, 500)

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
    await reorderCollectionFields({
      db,
      collectionId,
      fieldIds: parsed.data.fieldIds,
      cacheKv: c.env.CACHE_KV,
    })
    return c.json({ message: 'Fields reordered successfully' })
  } catch (error) {
    console.error('[admin-api-collections] Error reordering fields:', error)
    return c.json({ error: 'Failed to reorder fields' }, 500)
  }
})
