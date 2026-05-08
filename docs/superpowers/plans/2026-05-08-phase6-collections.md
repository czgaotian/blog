# Phase 6: Collections SPA Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Collections management (list + full field editor) from legacy HTMX templates to the React SPA.

**Architecture:** New `admin-api-collections.ts` server route handles all JSON CRUD for collections and fields, mounted at `/admin/api/collections` before the existing `adminApiRoutes` catch-all. Shared types in `packages/shared/src/admin-api/collections.ts`. React frontend adds a `Dialog` UI primitive, React Query hooks, a list page, and a create/edit page with inline field management.

**Tech Stack:** Hono (server), Zod (validation), Vitest (tests), React + React Query + React Router (frontend), Tailwind CSS (styles).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/shared/src/admin-api/collections.ts` | Types + Zod schemas for collections & fields |
| Modify | `packages/shared/src/admin-api/index.ts` | Re-export new collections module |
| Create | `packages/server/src/routes/admin-api-collections.ts` | JSON CRUD: collections + fields |
| Create | `packages/server/src/routes/admin-api-collections.test.ts` | Vitest tests for all endpoints |
| Modify | `packages/server/src/routes/index.ts` | Export `adminApiCollectionsRoutes` |
| Modify | `packages/server/src/app.ts` | Mount at `/admin/api/collections` before `adminApiRoutes` |
| Create | `packages/admin/src/spa/components/ui/dialog.tsx` | Modal dialog primitive |
| Create | `packages/admin/src/spa/api/collections.ts` | React Query hooks |
| Create | `packages/admin/src/spa/pages/collections-list.tsx` | Collections list page |
| Create | `packages/admin/src/spa/pages/collection-edit.tsx` | Create/edit collection + field management |
| Modify | `packages/admin/src/spa/router.tsx` | Add 3 new routes |
| Modify | `packages/admin/src/spa/layouts/admin-layout.tsx` | Remove `legacy: true` from Collections nav item |
| Modify | `docs/react-migration/task_plan.md` | Mark Phase 6 complete |

---

## Task 1: Shared types for collections

**Files:**
- Create: `packages/shared/src/admin-api/collections.ts`
- Modify: `packages/shared/src/admin-api/index.ts`

- [ ] **Step 1: Create the shared types file**

`packages/shared/src/admin-api/collections.ts`:

```typescript
import { z } from 'zod'

export const FIELD_TYPES = [
  'text', 'slug', 'number', 'boolean', 'date',
  'select', 'radio', 'media', 'reference',
  'richtext', 'quill', 'markdown',
] as const

export type FieldType = typeof FIELD_TYPES[number]

export interface CollectionField {
  id: string
  fieldName: string
  fieldLabel: string
  fieldType: string
  fieldOptions: Record<string, unknown>
  fieldOrder: number
  isRequired: boolean
  isSearchable: boolean
}

export interface CollectionListItem {
  id: string
  name: string
  displayName: string
  description: string | null
  isActive: boolean
  managed: boolean
  fieldCount: number
  createdAt: string
  updatedAt: string
}

export interface CollectionsListResponse {
  collections: CollectionListItem[]
  total: number
}

export interface CollectionDetailResponse {
  id: string
  name: string
  displayName: string
  description: string | null
  isActive: boolean
  managed: boolean
  fields: CollectionField[]
  createdAt: string
  updatedAt: string
}

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(255).regex(/^[a-z0-9_]+$/, 'Must contain only lowercase letters, numbers, and underscores'),
  displayName: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
})

export const updateCollectionSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
})

export const createFieldSchema = z.object({
  fieldName: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'Must contain only lowercase letters, numbers, and underscores'),
  fieldLabel: z.string().min(1).max(255),
  fieldType: z.string().min(1),
  isRequired: z.boolean().optional().default(false),
  isSearchable: z.boolean().optional().default(false),
  fieldOptions: z.record(z.string(), z.unknown()).optional().default({}),
})

export const updateFieldSchema = z.object({
  fieldLabel: z.string().min(1).max(255).optional(),
  fieldType: z.string().min(1).optional(),
  isRequired: z.boolean().optional(),
  isSearchable: z.boolean().optional(),
  fieldOptions: z.record(z.string(), z.unknown()).optional(),
})

export type CreateCollectionRequest = z.infer<typeof createCollectionSchema>
export type UpdateCollectionRequest = z.infer<typeof updateCollectionSchema>
export type CreateFieldRequest = z.infer<typeof createFieldSchema>
export type UpdateFieldRequest = z.infer<typeof updateFieldSchema>

export interface MutateCollectionResponse {
  message: string
  id?: string
}
```

- [ ] **Step 2: Re-export from index**

In `packages/shared/src/admin-api/index.ts`, add after the `content` export line:

```typescript
export * from './collections'
```

- [ ] **Step 3: Verify types compile**

```bash
pnpm --filter shared type-check 2>&1 || pnpm type-check 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/admin-api/collections.ts packages/shared/src/admin-api/index.ts
git commit -m "feat: add shared types for collections phase 6"
```

---

## Task 2: Server route — collections + fields CRUD

**Files:**
- Create: `packages/server/src/routes/admin-api-collections.ts`

- [ ] **Step 1: Create the route file**

`packages/server/src/routes/admin-api-collections.ts`:

```typescript
import { Hono } from 'hono'
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

export const adminApiCollectionsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminApiCollectionsRoutes.use('*', requireAuth())
adminApiCollectionsRoutes.use('*', requireRole(['admin', 'editor']))
adminApiCollectionsRoutes.post('*', requireRole(['admin']))
adminApiCollectionsRoutes.put('*', requireRole(['admin']))
adminApiCollectionsRoutes.delete('*', requireRole(['admin']))

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

    try {
      await c.env.CACHE_KV.delete('cache:collections:all')
      await c.env.CACHE_KV.delete(`cache:collection:${parsed.data.name}`)
    } catch { /* ignore cache errors */ }

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

    try {
      await c.env.CACHE_KV.delete('cache:collections:all')
      await c.env.CACHE_KV.delete(`cache:collection:${existing.name}`)
    } catch { /* ignore */ }

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
    const existing = await db.prepare('SELECT name, managed FROM collections WHERE id = ?').bind(id).first() as any
    if (!existing) return c.json({ error: 'Collection not found' }, 404)
    if (existing.managed) return c.json({ error: 'Cannot delete a managed collection' }, 400)

    const contentCount = await db.prepare('SELECT COUNT(*) as count FROM content WHERE collection_id = ?').bind(id).first() as any
    if (contentCount?.count > 0) {
      return c.json({ error: `Cannot delete collection: it has ${contentCount.count} content items` }, 400)
    }

    await db.prepare('DELETE FROM content_fields WHERE collection_id = ?').bind(id).run()
    await db.prepare('DELETE FROM collections WHERE id = ?').bind(id).run()

    try {
      await c.env.CACHE_KV.delete('cache:collections:all')
      await c.env.CACHE_KV.delete(`cache:collection:${existing.name}`)
    } catch { /* ignore */ }

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
      schema.properties[fieldName] = updated

      const idx = schema.required.indexOf(fieldName)
      if (parsed.data.isRequired === true && idx === -1) schema.required.push(fieldName)
      else if (parsed.data.isRequired === false && idx !== -1) schema.required.splice(idx, 1)

      await db.prepare('UPDATE collections SET schema = ?, updated_at = ? WHERE id = ?')
        .bind(JSON.stringify(schema), Date.now(), collectionId).run()
      return c.json({ message: 'Field updated successfully' })
    }

    // legacy content_fields row
    const existing = await db.prepare('SELECT id FROM content_fields WHERE id = ?').bind(fieldId).first()
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
      return c.json({ message: 'Field deleted successfully' })
    }
    await db.prepare('DELETE FROM content_fields WHERE id = ?').bind(fieldId).run()
    return c.json({ message: 'Field deleted successfully' })
  } catch (error) {
    console.error('[admin-api-collections] Error deleting field:', error)
    return c.json({ error: 'Failed to delete field' }, 500)
  }
})

// POST /:id/fields/reorder
adminApiCollectionsRoutes.post('/:id/fields/reorder', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

  const parsed = (body as any)
  if (!Array.isArray(parsed?.fieldIds)) return c.json({ error: 'fieldIds array required' }, 400)

  const db = c.env.DB
  try {
    for (let i = 0; i < parsed.fieldIds.length; i++) {
      await db.prepare('UPDATE content_fields SET field_order = ?, updated_at = ? WHERE id = ?')
        .bind(i + 1, Date.now(), parsed.fieldIds[i]).run()
    }
    return c.json({ message: 'Fields reordered successfully' })
  } catch (error) {
    console.error('[admin-api-collections] Error reordering fields:', error)
    return c.json({ error: 'Failed to reorder fields' }, 500)
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/routes/admin-api-collections.ts
git commit -m "feat: add admin-api-collections server route"
```

---

## Task 3: Tests for the server route

**Files:**
- Create: `packages/server/src/routes/admin-api-collections.test.ts`

- [ ] **Step 1: Create the test file**

`packages/server/src/routes/admin-api-collections.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../middleware', () => ({
  requireAuth: () => async (_c: any, next: any) => { await next() },
  requireRole: () => async (_c: any, next: any) => { await next() },
}))

const mockSchema = JSON.stringify({
  type: 'object',
  properties: {
    title: { type: 'string', title: 'Title' },
  },
  required: ['title'],
})

const mockCollection = {
  id: 'col1',
  name: 'blog_posts',
  display_name: 'Blog Posts',
  description: 'My blog',
  is_active: 1,
  managed: 0,
  schema: mockSchema,
  source_type: null,
  created_at: 1700000000000,
  updated_at: 1700000000000,
}

const mockDb: any = {
  prepare: (sql: string) => ({
    bind: (..._args: any[]) => ({
      first: async () => {
        if (sql.includes('COUNT(*)')) return { count: 0 }
        if (sql.includes('content_fields') && sql.includes('SELECT id')) return null
        return mockCollection
      },
      all: async () => {
        if (sql.includes('content_fields') && sql.includes('GROUP BY')) return { results: [{ collection_id: 'col1', count: 1 }] }
        if (sql.includes('content_fields')) return { results: [] }
        return { results: [mockCollection] }
      },
      run: async () => ({}),
    }),
    first: async () => mockCollection,
    all: async () => ({ results: [mockCollection] }),
    run: async () => ({}),
  }),
}

const mockEnv = {
  DB: mockDb,
  CACHE_KV: { delete: async () => {} },
}

import { adminApiCollectionsRoutes } from './admin-api-collections'

function createApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', { userId: 'u1', email: 'admin@test.com', role: 'admin', exp: 0, iat: 0 })
    await next()
  })
  app.route('/admin/api/collections', adminApiCollectionsRoutes)
  return app
}

describe('GET /admin/api/collections', () => {
  it('returns collections list', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/collections', {}, mockEnv)
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('collections')
    expect(json).toHaveProperty('total')
    expect(json.collections[0].name).toBe('blog_posts')
    expect(json.collections[0].displayName).toBe('Blog Posts')
  })

  it('returns 401 when unauthenticated', async () => {
    const app = new Hono()
    app.route('/admin/api/collections', adminApiCollectionsRoutes)
    const res = await app.request('/admin/api/collections', {}, mockEnv)
    expect(res.status).toBe(401)
  })
})

describe('GET /admin/api/collections/:id', () => {
  it('returns collection detail with fields from schema', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/collections/col1', {}, mockEnv)
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json.id).toBe('col1')
    expect(json.name).toBe('blog_posts')
    expect(Array.isArray(json.fields)).toBe(true)
    expect(json.fields[0].fieldName).toBe('title')
  })

  it('returns 404 for unknown id', async () => {
    const nullDb: any = {
      prepare: () => ({ bind: () => ({ first: async () => null, all: async () => ({ results: [] }) }) }),
    }
    const app = createApp()
    const res = await app.request('/admin/api/collections/nope', {}, { ...mockEnv, DB: nullDb })
    expect(res.status).toBe(404)
  })
})

describe('POST /admin/api/collections', () => {
  it('creates a collection and returns 201', async () => {
    const noExistDb: any = {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => {
            if (sql.includes('SELECT id FROM collections WHERE name')) return null
            return null
          },
          run: async () => ({}),
          all: async () => ({ results: [] }),
        }),
        run: async () => ({}),
      }),
    }
    const app = createApp()
    const res = await app.request('/admin/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'new_col', displayName: 'New Col' }),
    }, { ...mockEnv, DB: noExistDb })
    expect(res.status).toBe(201)
    const json = await res.json() as any
    expect(json).toHaveProperty('id')
    expect(json.message).toBe('Collection created successfully')
  })

  it('returns 422 on validation failure', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Invalid Name With Spaces', displayName: 'Test' }),
    }, mockEnv)
    expect(res.status).toBe(422)
  })
})

describe('PATCH /admin/api/collections/:id', () => {
  it('updates a collection', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/collections/col1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Updated Name' }),
    }, mockEnv)
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json.message).toBe('Collection updated successfully')
  })
})

describe('DELETE /admin/api/collections/:id', () => {
  it('deletes a collection with no content', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/collections/col1', {
      method: 'DELETE',
    }, mockEnv)
    expect(res.status).toBe(200)
  })

  it('blocks delete when collection has content', async () => {
    const contentDb: any = {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => {
            if (sql.includes('COUNT(*)')) return { count: 3 }
            return { name: 'blog_posts', managed: 0 }
          },
          run: async () => ({}),
          all: async () => ({ results: [] }),
        }),
      }),
    }
    const app = createApp()
    const res = await app.request('/admin/api/collections/col1', {
      method: 'DELETE',
    }, { ...mockEnv, DB: contentDb })
    expect(res.status).toBe(400)
  })
})

describe('POST /admin/api/collections/:id/fields', () => {
  it('adds a field to the collection schema', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/collections/col1/fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldName: 'body', fieldLabel: 'Body', fieldType: 'text' }),
    }, mockEnv)
    expect(res.status).toBe(201)
    const json = await res.json() as any
    expect(json.message).toBe('Field added successfully')
  })

  it('returns 422 when fieldName has invalid characters', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/collections/col1/fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldName: 'Bad Field', fieldLabel: 'Bad', fieldType: 'text' }),
    }, mockEnv)
    expect(res.status).toBe(422)
  })
})

describe('PUT /admin/api/collections/:id/fields/:fieldId', () => {
  it('updates a schema field', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/collections/col1/fields/schema-title', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldLabel: 'Updated Title' }),
    }, mockEnv)
    expect(res.status).toBe(200)
  })
})

describe('DELETE /admin/api/collections/:id/fields/:fieldId', () => {
  it('deletes a schema field', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/collections/col1/fields/schema-title', {
      method: 'DELETE',
    }, mockEnv)
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run tests and verify they pass**

```bash
pnpm --filter server test -- admin-api-collections 2>&1 | tail -15
```

Expected: all tests pass, no failures.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/routes/admin-api-collections.test.ts
git commit -m "test: add tests for admin-api-collections route"
```

---

## Task 4: Wire server route into app

**Files:**
- Modify: `packages/server/src/routes/index.ts`
- Modify: `packages/server/src/app.ts`

- [ ] **Step 1: Export from routes/index.ts**

Add after the `adminApiMediaRoutes` export line in `packages/server/src/routes/index.ts`:

```typescript
export { adminApiCollectionsRoutes } from './admin-api-collections'
```

- [ ] **Step 2: Mount in app.ts**

In `packages/server/src/app.ts`, add `adminApiCollectionsRoutes` to the import from `'./routes'`:

```typescript
  adminApiMediaRoutes,
  adminApiCollectionsRoutes,
} from './routes'
```

Then add the route mount **before** the `app.route('/admin/api', adminApiRoutes)` line (so the dedicated route takes priority over the catch-all in adminApiRoutes):

```typescript
  app.route('/admin/api/collections', adminApiCollectionsRoutes)
  app.route('/admin/api', adminApiRoutes)
```

Remove the old line `app.route('/admin/api', adminApiRoutes)` if it now appears twice (keep only the version preceded by the collections route).

- [ ] **Step 3: Run full server test suite**

```bash
pnpm --filter server test 2>&1 | tail -10
```

Expected: all 578+ tests pass.

- [ ] **Step 4: Type-check**

```bash
pnpm type-check 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/routes/index.ts packages/server/src/app.ts
git commit -m "feat: mount admin-api-collections route in app"
```

---

## Task 5: Dialog UI primitive

**Files:**
- Create: `packages/admin/src/spa/components/ui/dialog.tsx`

- [ ] **Step 1: Create the Dialog component**

`packages/admin/src/spa/components/ui/dialog.tsx`:

```typescript
import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div
        className={cn(
          'w-full max-w-lg rounded-lg border border-border bg-card shadow-lg',
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="dialog-title" className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check admin package**

```bash
pnpm --filter admin type-check 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/admin/src/spa/components/ui/dialog.tsx
git commit -m "feat: add Dialog UI primitive"
```

---

## Task 6: React Query hooks for collections

**Files:**
- Create: `packages/admin/src/spa/api/collections.ts`

- [ ] **Step 1: Create the hooks file**

`packages/admin/src/spa/api/collections.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  CollectionsListResponse,
  CollectionDetailResponse,
  MutateCollectionResponse,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  CreateFieldRequest,
  UpdateFieldRequest,
} from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export interface CollectionsFilters {
  search?: string
}

export function useCollectionsList(filters: CollectionsFilters = {}) {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  const qs = params.toString()
  return useQuery<CollectionsListResponse>({
    queryKey: ['admin', 'collections', filters],
    queryFn: () => adminFetch<CollectionsListResponse>(`/admin/api/collections${qs ? `?${qs}` : ''}`),
  })
}

export function useCollectionDetail(id: string) {
  return useQuery<CollectionDetailResponse>({
    queryKey: ['admin', 'collections', id],
    queryFn: () => adminFetch<CollectionDetailResponse>(`/admin/api/collections/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateCollection() {
  const qc = useQueryClient()
  return useMutation<MutateCollectionResponse, Error, CreateCollectionRequest>({
    mutationFn: (data) =>
      adminFetch<MutateCollectionResponse>('/admin/api/collections', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'collections'] })
    },
  })
}

export function useUpdateCollection(id: string) {
  const qc = useQueryClient()
  return useMutation<MutateCollectionResponse, Error, UpdateCollectionRequest>({
    mutationFn: (data) =>
      adminFetch<MutateCollectionResponse>(`/admin/api/collections/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'collections'] })
    },
  })
}

export function useDeleteCollection(id: string) {
  const qc = useQueryClient()
  return useMutation<MutateCollectionResponse, Error, void>({
    mutationFn: () =>
      adminFetch<MutateCollectionResponse>(`/admin/api/collections/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'collections'] })
    },
  })
}

export function useCreateField(collectionId: string) {
  const qc = useQueryClient()
  return useMutation<MutateCollectionResponse, Error, CreateFieldRequest>({
    mutationFn: (data) =>
      adminFetch<MutateCollectionResponse>(`/admin/api/collections/${collectionId}/fields`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'collections', collectionId] })
    },
  })
}

export function useUpdateField(collectionId: string, fieldId: string) {
  const qc = useQueryClient()
  return useMutation<MutateCollectionResponse, Error, UpdateFieldRequest>({
    mutationFn: (data) =>
      adminFetch<MutateCollectionResponse>(`/admin/api/collections/${collectionId}/fields/${fieldId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'collections', collectionId] })
    },
  })
}

export function useDeleteField(collectionId: string, fieldId: string) {
  const qc = useQueryClient()
  return useMutation<MutateCollectionResponse, Error, void>({
    mutationFn: () =>
      adminFetch<MutateCollectionResponse>(`/admin/api/collections/${collectionId}/fields/${fieldId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'collections', collectionId] })
    },
  })
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/admin/src/spa/api/collections.ts
git commit -m "feat: add React Query hooks for collections"
```

---

## Task 7: CollectionsListPage

**Files:**
- Create: `packages/admin/src/spa/pages/collections-list.tsx`

- [ ] **Step 1: Create the page**

`packages/admin/src/spa/pages/collections-list.tsx`:

```typescript
import { useState } from 'react'
import { Link } from 'react-router'
import { useCollectionsList } from '../api/collections'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { LoadingState } from '../components/ui/loading-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { FilterBar } from '../components/ui/filter-bar'

export function CollectionsListPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading, isError } = useCollectionsList({ search })

  return (
    <section className="space-y-6">
      <PageHeader
        title="Collections"
        description="Manage content type definitions and their fields."
        actions={
          <Button asChild size="sm">
            <Link to="/admin/collections/new">New collection</Link>
          </Button>
        }
      />

      <FilterBar
        searchLabel="Search by name…"
        onSubmit={(e) => {
          e.preventDefault()
          const q = new FormData(e.currentTarget).get('q') as string
          setSearch(q || '')
        }}
      />

      {isLoading && <LoadingState label="Loading collections" />}

      {isError && (
        <Alert title="Failed to load collections" tone="danger">
          Could not fetch collections. Try refreshing the page.
        </Alert>
      )}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Fields</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.collections.length === 0 ? (
              <TableRow>
                <TableCell className="text-center text-muted-foreground" colSpan={5}>
                  No collections found.
                </TableCell>
              </TableRow>
            ) : (
              data.collections.map(col => (
                <TableRow key={col.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-medium">{col.displayName}</p>
                      <p className="text-xs text-muted-foreground">{col.name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{col.fieldCount}</TableCell>
                  <TableCell>
                    {col.managed ? (
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">managed</Badge>
                    ) : col.isActive ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">active</Badge>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground">inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(col.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {!col.managed && (
                      <Link
                        to={`/admin/collections/${col.id}/edit`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Edit
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
```

> Note: `PageHeader` may not yet have an `actions` prop. Check `packages/admin/src/spa/components/page-header.tsx` — if it doesn't accept `actions`, add it:
>
> ```typescript
> interface PageHeaderProps {
>   title: string
>   description?: string
>   actions?: ReactNode
> }
>
> export function PageHeader({ title, description, actions }: PageHeaderProps) {
>   return (
>     <div className="flex items-start justify-between gap-4">
>       <div>
>         <h1 className="text-2xl font-semibold">{title}</h1>
>         {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
>       </div>
>       {actions && <div className="shrink-0">{actions}</div>}
>     </div>
>   )
> }
> ```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/admin/src/spa/pages/collections-list.tsx packages/admin/src/spa/components/page-header.tsx
git commit -m "feat: add CollectionsListPage"
```

---

## Task 8: CollectionEditPage

**Files:**
- Create: `packages/admin/src/spa/pages/collection-edit.tsx`

- [ ] **Step 1: Create the page**

`packages/admin/src/spa/pages/collection-edit.tsx`:

```typescript
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import {
  useCollectionDetail,
  useCreateCollection,
  useUpdateCollection,
  useDeleteCollection,
  useCreateField,
  useUpdateField,
  useDeleteField,
} from '../api/collections'
import type { CollectionField, CreateFieldRequest, FIELD_TYPES } from '@worker-blog/shared/admin-api'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Dialog } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { LoadingState } from '../components/ui/loading-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { AdminApiError } from '../api/client'

const ALL_FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'slug', label: 'URL Slug' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'radio', label: 'Radio' },
  { value: 'media', label: 'Media' },
  { value: 'reference', label: 'Reference' },
  { value: 'richtext', label: 'Rich Text' },
  { value: 'markdown', label: 'Markdown' },
]

type FieldDialogMode = 'add' | 'edit'

interface FieldFormState {
  fieldName: string
  fieldLabel: string
  fieldType: string
  isRequired: boolean
  isSearchable: boolean
}

const emptyFieldForm: FieldFormState = {
  fieldName: '',
  fieldLabel: '',
  fieldType: 'text',
  isRequired: false,
  isSearchable: false,
}

export function CollectionEditPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()

  const { data, isLoading, isError } = useCollectionDetail(isNew ? '' : id!)
  const createCollection = useCreateCollection()
  const updateCollection = useUpdateCollection(isNew ? '' : id!)
  const deleteCollection = useDeleteCollection(isNew ? '' : id!)

  const createField = useCreateField(isNew ? '' : id!)
  const [activeFieldId, setActiveFieldId] = useState<string>('')
  const updateField = useUpdateField(isNew ? '' : id!, activeFieldId)
  const deleteField = useDeleteField(isNew ? '' : id!, activeFieldId)

  // Collection basic form
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [collectionSaved, setCollectionSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Field dialog
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false)
  const [fieldDialogMode, setFieldDialogMode] = useState<FieldDialogMode>('add')
  const [fieldForm, setFieldForm] = useState<FieldFormState>(emptyFieldForm)
  const [fieldError, setFieldError] = useState<string | null>(null)

  useEffect(() => {
    if (data && !isNew) {
      setDisplayName(data.displayName)
      setDescription(data.description ?? '')
    }
  }, [data, isNew])

  async function handleCollectionSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCollectionSaved(false)
    if (isNew) {
      const result = await createCollection.mutateAsync({ name, displayName, description: description || undefined })
      navigate(`/admin/collections/${result.id}/edit`)
    } else {
      await updateCollection.mutateAsync({ displayName, description: description || undefined })
      setCollectionSaved(true)
    }
  }

  async function handleDeleteCollection() {
    await deleteCollection.mutateAsync()
    navigate('/admin/collections')
  }

  function openAddField() {
    setFieldForm(emptyFieldForm)
    setFieldError(null)
    setFieldDialogMode('add')
    setFieldDialogOpen(true)
  }

  function openEditField(field: CollectionField) {
    setActiveFieldId(field.id)
    setFieldForm({
      fieldName: field.fieldName,
      fieldLabel: field.fieldLabel,
      fieldType: field.fieldType,
      isRequired: field.isRequired,
      isSearchable: field.isSearchable,
    })
    setFieldError(null)
    setFieldDialogMode('edit')
    setFieldDialogOpen(true)
  }

  async function handleFieldSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldError(null)
    try {
      if (fieldDialogMode === 'add') {
        await createField.mutateAsync({
          fieldName: fieldForm.fieldName,
          fieldLabel: fieldForm.fieldLabel,
          fieldType: fieldForm.fieldType,
          isRequired: fieldForm.isRequired,
          isSearchable: fieldForm.isSearchable,
        })
      } else {
        await updateField.mutateAsync({
          fieldLabel: fieldForm.fieldLabel,
          fieldType: fieldForm.fieldType,
          isRequired: fieldForm.isRequired,
          isSearchable: fieldForm.isSearchable,
        })
      }
      setFieldDialogOpen(false)
    } catch (err) {
      setFieldError(err instanceof AdminApiError ? err.message : 'Unexpected error')
    }
  }

  async function handleDeleteField(field: CollectionField) {
    setActiveFieldId(field.id)
    await deleteField.mutateAsync()
  }

  if (!isNew && isLoading) return <LoadingState label="Loading collection" />
  if (!isNew && isError) return <Alert title="Failed to load collection" tone="danger">Try refreshing.</Alert>

  const fields = data?.fields ?? []
  const collectionMutationError = createCollection.error || updateCollection.error

  return (
    <section className="space-y-8">
      <PageHeader
        title={isNew ? 'New collection' : `Edit: ${data?.displayName ?? ''}`}
        description={isNew ? 'Create a new content type.' : 'Update collection settings and fields.'}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/collections">Back to collections</Link>
          </Button>
        }
      />

      {/* Basic info form */}
      <form onSubmit={handleCollectionSubmit} className="space-y-4 max-w-lg">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic info</h2>

        {collectionMutationError && (
          <Alert title="Save failed" tone="danger">
            {collectionMutationError instanceof AdminApiError
              ? collectionMutationError.message
              : 'Unexpected error'}
          </Alert>
        )}
        {collectionSaved && (
          <Alert title="Saved" tone="success">Collection updated.</Alert>
        )}

        {isNew && (
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name <span className="text-muted-foreground text-xs">(lowercase, underscores only)</span></Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. blog_posts"
              required
              pattern="^[a-z0-9_]+$"
            />
          </div>
        )}

        {!isNew && (
          <div className="grid gap-1.5">
            <Label>Name</Label>
            <Input value={data?.name ?? ''} disabled />
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="e.g. Blog Posts"
            required
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={createCollection.isPending || updateCollection.isPending}>
            {createCollection.isPending || updateCollection.isPending ? 'Saving…' : isNew ? 'Create collection' : 'Save'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/admin/collections')}>
            Cancel
          </Button>
        </div>
      </form>

      {/* Fields section — only shown after collection exists */}
      {!isNew && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fields</h2>
            <Button type="button" size="sm" onClick={openAddField}>Add field</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Required</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center text-muted-foreground" colSpan={5}>
                    No fields yet. Add your first field.
                  </TableCell>
                </TableRow>
              ) : (
                fields.map(field => (
                  <TableRow key={field.id}>
                    <TableCell className="text-xs font-mono text-muted-foreground">{field.fieldName}</TableCell>
                    <TableCell className="font-medium">{field.fieldLabel}</TableCell>
                    <TableCell>
                      <Badge className="bg-muted text-muted-foreground">{field.fieldType}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {field.isRequired ? '✓' : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={() => openEditField(field)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs font-medium text-destructive hover:underline"
                          onClick={() => handleDeleteField(field)}
                        >
                          Delete
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete collection — danger zone */}
      {!isNew && !data?.managed && (
        <div className="border-t border-border pt-6">
          <p className="mb-3 text-sm font-medium text-destructive">Danger zone</p>
          {!confirmDelete ? (
            <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)}>
              Delete collection
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">This cannot be undone.</p>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteCollection.isPending}
                onClick={handleDeleteCollection}
              >
                {deleteCollection.isPending ? 'Deleting…' : 'Confirm delete'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          )}
          {deleteCollection.isError && (
            <Alert title="Delete failed" tone="danger" className="mt-3">
              {deleteCollection.error instanceof AdminApiError
                ? deleteCollection.error.message
                : 'Unexpected error'}
            </Alert>
          )}
        </div>
      )}

      {/* Field add/edit dialog */}
      <Dialog
        open={fieldDialogOpen}
        onClose={() => setFieldDialogOpen(false)}
        title={fieldDialogMode === 'add' ? 'Add field' : 'Edit field'}
      >
        <form onSubmit={handleFieldSubmit} className="space-y-4">
          {fieldError && (
            <Alert title="Error" tone="danger">{fieldError}</Alert>
          )}

          {fieldDialogMode === 'add' && (
            <div className="grid gap-1.5">
              <Label htmlFor="fieldName">Field name <span className="text-muted-foreground text-xs">(lowercase, underscores only)</span></Label>
              <Input
                id="fieldName"
                value={fieldForm.fieldName}
                onChange={e => setFieldForm(f => ({ ...f, fieldName: e.target.value }))}
                placeholder="e.g. published_at"
                required
                pattern="^[a-z0-9_]+$"
              />
            </div>
          )}

          {fieldDialogMode === 'edit' && (
            <div className="grid gap-1.5">
              <Label>Field name</Label>
              <Input value={fieldForm.fieldName} disabled />
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="fieldLabel">Label</Label>
            <Input
              id="fieldLabel"
              value={fieldForm.fieldLabel}
              onChange={e => setFieldForm(f => ({ ...f, fieldLabel: e.target.value }))}
              placeholder="e.g. Published At"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="fieldType">Type</Label>
            <select
              id="fieldType"
              value={fieldForm.fieldType}
              onChange={e => setFieldForm(f => ({ ...f, fieldType: e.target.value }))}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {ALL_FIELD_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={fieldForm.isRequired}
                onChange={e => setFieldForm(f => ({ ...f, isRequired: e.target.checked }))}
                className="rounded border-input"
              />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={fieldForm.isSearchable}
                onChange={e => setFieldForm(f => ({ ...f, isSearchable: e.target.checked }))}
                className="rounded border-input"
              />
              Searchable
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setFieldDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createField.isPending || updateField.isPending}
            >
              {createField.isPending || updateField.isPending
                ? 'Saving…'
                : fieldDialogMode === 'add' ? 'Add field' : 'Save field'}
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/admin/src/spa/pages/collection-edit.tsx
git commit -m "feat: add CollectionEditPage with field management"
```

---

## Task 9: Wire routes, update nav, mark Phase 6 complete

**Files:**
- Modify: `packages/admin/src/spa/router.tsx`
- Modify: `packages/admin/src/spa/layouts/admin-layout.tsx`
- Modify: `docs/react-migration/task_plan.md`

- [ ] **Step 1: Add routes to router.tsx**

In `packages/admin/src/spa/router.tsx`, add imports:

```typescript
import { CollectionsListPage } from './pages/collections-list'
import { CollectionEditPage } from './pages/collection-edit'
```

Add routes inside the children array after the `media` route:

```typescript
{ path: 'collections', element: <CollectionsListPage /> },
{ path: 'collections/new', element: <CollectionEditPage /> },
{ path: 'collections/:id/edit', element: <CollectionEditPage /> },
```

- [ ] **Step 2: Remove legacy flag from Collections nav**

In `packages/admin/src/spa/layouts/admin-layout.tsx`, change:

```typescript
{ label: 'Collections', href: '/admin/collections', icon: Database, legacy: true },
```

to:

```typescript
{ label: 'Collections', href: '/admin/collections', icon: Database },
```

- [ ] **Step 3: Update task_plan.md**

In `docs/react-migration/task_plan.md`, update the scope line and add a Phase 6 section:

Scope line:
```
Phase 4 complete. Phase 5 complete (content, media, forms). Phase 6 complete (collections). All planned phases complete.
```

Add Phase 6 section after Phase 5:

```markdown
### Phase 6: Collections Migration

- [x] Add shared types: CollectionListItem, CollectionsListResponse, CollectionDetailResponse, CollectionField, CreateCollectionRequest, UpdateCollectionRequest, CreateFieldRequest, UpdateFieldRequest, MutateCollectionResponse.
- [x] Add server route adminApiCollectionsRoutes with full CRUD for collections and fields (POST/PUT/DELETE /:id/fields).
- [x] Mount /admin/api/collections before adminApiRoutes in app.ts.
- [x] Add Dialog UI primitive.
- [x] Add React Query hooks: useCollectionsList, useCollectionDetail, useCreateCollection, useUpdateCollection, useDeleteCollection, useCreateField, useUpdateField, useDeleteField.
- [x] Add React pages: CollectionsListPage, CollectionEditPage (with inline field management via Dialog).
- [x] Wire 3 routes into SPA router; remove legacy: true from Collections nav item.
```

- [ ] **Step 4: Run full test suite and type-check**

```bash
pnpm type-check 2>&1 | tail -5
pnpm --filter server test 2>&1 | tail -10
pnpm --filter admin test 2>&1 | tail -10
```

Expected: all tests pass, no type errors.

- [ ] **Step 5: Commit everything**

```bash
git add packages/admin/src/spa/router.tsx \
  packages/admin/src/spa/layouts/admin-layout.tsx \
  docs/react-migration/task_plan.md
git commit -m "feat: Phase 6 - wire collections routes and update nav"
```

---

## Self-Review

**Spec coverage check:**
- ✅ CollectionsListPage — Task 7
- ✅ CollectionEditPage with field add/edit/delete via Dialog — Task 8
- ✅ Server route with all field CRUD including schema-prefix fields — Task 2
- ✅ Shared types with Zod schemas — Task 1
- ✅ Dialog UI primitive — Task 5
- ✅ React Query hooks — Task 6
- ✅ Routes wired + nav updated — Task 9
- ✅ Tests for server route — Task 3
- ✅ Mount in app.ts before catch-all — Task 4

**Placeholder scan:** No TBDs or TODOs found.

**Type consistency check:**
- `MutateCollectionResponse` used in hooks matches type defined in Task 1 ✅
- `CollectionField` imported from shared in Task 8 matches fields returned by `getFields()` in Task 2 ✅
- `useUpdateField(collectionId, fieldId)` signature in Task 6 matches usage in Task 8 ✅
- `createCollectionSchema` / `updateCollectionSchema` / `createFieldSchema` / `updateFieldSchema` from shared used in Task 2 route ✅
