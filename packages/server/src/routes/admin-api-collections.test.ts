import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../middleware', () => ({
  requireAuth: () => async (_c: any, next: any) => { await next() },
  requireRole: () => async (_c: any, next: any) => { await next() },
}))

const mockCollection = {
  id: 'col1',
  name: 'blog_posts',
  display_name: 'Blog Posts',
  description: 'A collection of blog posts',
  is_active: 1,
  schema: JSON.stringify({
    type: 'object',
    properties: {
      title: { type: 'string', title: 'Title' },
      body: { type: 'string', title: 'Body', format: 'markdown', searchable: true },
    },
    required: ['title'],
  }),
  created_at: 1700000000000,
  updated_at: 1700000000000,
}

function makeMockDb(overrides: Partial<{
  collectionFirst: any
  contentCount: number
  collectionResults: any[]
}> = {}) {
  const {
    collectionFirst = mockCollection,
    contentCount = 0,
    collectionResults = [mockCollection],
  } = overrides

  const runCalls: string[] = []

  const mockDb: any = {
    prepare: (sql: string) => ({
      bind: (..._args: any[]) => ({
        first: async () => {
          if (sql.includes('COUNT(*) as count') && sql.includes('content')) {
            return { count: contentCount }
          }
          if (sql.includes('SELECT name FROM collections') || (sql.includes('SELECT * FROM collections') && !sql.includes('name = ?'))) {
            return collectionFirst
          }
          if (sql.includes('SELECT id FROM collections') || sql.includes('SELECT name FROM collections')) {
            return collectionFirst
          }
          if (sql.includes('SELECT * FROM collections')) {
            return collectionFirst
          }
          if (sql.includes('SELECT name FROM collections WHERE id = ?')) {
            return collectionFirst
          }
          throw new Error(`Unexpected SQL in mock first(): ${sql}`)
        },
        all: async () => {
          if (sql.includes('SELECT id, name') && sql.includes('collections')) {
            return { results: collectionResults }
          }
          if (sql.includes('FROM collections')) {
            return { results: collectionResults }
          }
          return { results: [] }
        },
        run: async () => { runCalls.push(sql); return {} },
      }),
      first: async () => collectionFirst,
      all: async () => ({ results: collectionResults }),
      run: async () => { runCalls.push(sql); return {} },
    }),
  }
  return { db: mockDb, runCalls }
}

const mockCacheKV = { delete: async () => {} }

import { adminApiCollectionsRoutes } from './admin-api-collections'

function createApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', { userId: 'u1', email: 'admin@test.com', role: 'admin', exp: 0, iat: 0 })
    await next()
  })
  app.route('/api/admin/collections', adminApiCollectionsRoutes)
  return app
}

function createUnauthApp() {
  const app = new Hono()
  app.route('/api/admin/collections', adminApiCollectionsRoutes)
  return app
}

const baseEnv = { DB: makeMockDb().db, CACHE_KV: mockCacheKV }

// ──────────────────────────────────────────────
// GET /
// ──────────────────────────────────────────────
describe('GET /api/admin/collections', () => {
  it('returns collections list with correct shape', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/collections', {}, baseEnv)
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('collections')
    expect(json).toHaveProperty('total')
    expect(Array.isArray(json.collections)).toBe(true)
    const col = json.collections[0]
    expect(col).toHaveProperty('id', 'col1')
    expect(col).toHaveProperty('name', 'blog_posts')
    expect(col).toHaveProperty('displayName', 'Blog Posts')
    expect(col).toHaveProperty('isActive')
    expect(col).toHaveProperty('fieldCount', 2)
    expect(col).toHaveProperty('createdAt')
    expect(col).toHaveProperty('updatedAt')
  })

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp()
    const res = await app.request('/api/admin/collections', {}, baseEnv)
    expect(res.status).toBe(401)
  })
})

// ──────────────────────────────────────────────
// GET /:id
// ──────────────────────────────────────────────
describe('GET /api/admin/collections/:id', () => {
  it('returns collection detail with fields from schema', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/collections/col1', {}, baseEnv)
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('id', 'col1')
    expect(json).toHaveProperty('name', 'blog_posts')
    expect(json).toHaveProperty('displayName', 'Blog Posts')
    expect(json).toHaveProperty('fields')
    expect(Array.isArray(json.fields)).toBe(true)
    expect(json).toHaveProperty('createdAt')
    expect(json).toHaveProperty('updatedAt')
  })

  it('returns 404 for unknown id', async () => {
    const { db } = makeMockDb({ collectionFirst: null })
    const app = createApp()
    const res = await app.request('/api/admin/collections/unknown', {}, { DB: db, CACHE_KV: mockCacheKV })
    expect(res.status).toBe(404)
    const json = await res.json() as any
    expect(json).toHaveProperty('error')
  })

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp()
    const res = await app.request('/api/admin/collections/col1', {}, baseEnv)
    expect(res.status).toBe(401)
  })
})

// ──────────────────────────────────────────────
// POST /
// ──────────────────────────────────────────────
describe('POST /api/admin/collections', () => {
  it('creates a collection and returns 201', async () => {
    // Make sure no existing collection with that name
    const { db, runCalls } = makeMockDb()
    // Override to return null for "SELECT id FROM collections WHERE name = ?"
    const originalPrepare = db.prepare.bind(db)
    db.prepare = (sql: string) => {
      if (sql.includes('SELECT id FROM collections WHERE name')) {
        return {
          bind: () => ({
            first: async () => null,
            all: async () => ({ results: [] }),
            run: async () => { runCalls.push(sql); return {} },
          }),
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => { runCalls.push(sql); return {} },
        }
      }
      return originalPrepare(sql)
    }

    const app = createApp()
    const res = await app.request('/api/admin/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'new_posts', displayName: 'New Posts' }),
    }, { DB: db, CACHE_KV: mockCacheKV })
    expect(res.status).toBe(201)
    const json = await res.json() as any
    expect(json).toHaveProperty('message')
    expect(json).toHaveProperty('id')
    expect(runCalls.some(s => s.includes('INSERT INTO collections'))).toBe(true)
  })

  it('returns 422 on validation failure (missing displayName)', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'new_posts' }),
    }, baseEnv)
    expect(res.status).toBe(422)
    const json = await res.json() as any
    expect(json).toHaveProperty('error')
  })

  it('returns 422 on validation failure (invalid name chars)', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Invalid Name!', displayName: 'Invalid' }),
    }, baseEnv)
    expect(res.status).toBe(422)
  })

  it('returns 409 when collection name already exists', async () => {
    // mockDb returns existing by default for "SELECT id FROM collections WHERE name = ?"
    const { db } = makeMockDb({ collectionFirst: { id: 'existing-id' } })
    const app = createApp()
    const res = await app.request('/api/admin/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'blog_posts', displayName: 'Blog Posts' }),
    }, { DB: db, CACHE_KV: mockCacheKV })
    expect(res.status).toBe(409)
  })
})

// ──────────────────────────────────────────────
// PATCH /:id
// ──────────────────────────────────────────────
describe('PATCH /api/admin/collections/:id', () => {
  it('updates a collection and returns 200', async () => {
    const { db, runCalls } = makeMockDb()
    const app = createApp()
    const res = await app.request('/api/admin/collections/col1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Updated Name' }),
    }, { DB: db, CACHE_KV: mockCacheKV })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('message')
    expect(runCalls.some(s => s.includes('UPDATE collections SET'))).toBe(true)
  })

  it('returns 404 for unknown id', async () => {
    const { db } = makeMockDb({ collectionFirst: null })
    const app = createApp()
    const res = await app.request('/api/admin/collections/unknown', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Updated Name' }),
    }, { DB: db, CACHE_KV: mockCacheKV })
    expect(res.status).toBe(404)
  })

  it('returns 400 when no fields to update', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/collections/col1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }, baseEnv)
    expect(res.status).toBe(400)
  })
})

// ──────────────────────────────────────────────
// DELETE /:id
// ──────────────────────────────────────────────
describe('DELETE /api/admin/collections/:id', () => {
  it('deletes collection with no content', async () => {
    const { db, runCalls } = makeMockDb({ contentCount: 0 })
    const app = createApp()
    const res = await app.request('/api/admin/collections/col1', {
      method: 'DELETE',
    }, { DB: db, CACHE_KV: mockCacheKV })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('message')
    expect(runCalls.some(s => s.includes('DELETE FROM collections'))).toBe(true)
  })

  it('blocks delete when collection has content', async () => {
    const { db } = makeMockDb({ contentCount: 3 })
    const app = createApp()
    const res = await app.request('/api/admin/collections/col1', {
      method: 'DELETE',
    }, { DB: db, CACHE_KV: mockCacheKV })
    expect(res.status).toBe(400)
    const json = await res.json() as any
    expect(json.error).toMatch(/content items/)
  })

  it('returns 404 for unknown id', async () => {
    const { db } = makeMockDb({ collectionFirst: null })
    const app = createApp()
    const res = await app.request('/api/admin/collections/unknown', {
      method: 'DELETE',
    }, { DB: db, CACHE_KV: mockCacheKV })
    expect(res.status).toBe(404)
  })
})

// ──────────────────────────────────────────────
// POST /:id/fields
// ──────────────────────────────────────────────
describe('POST /api/admin/collections/:id/fields', () => {
  it('adds a field to schema and returns 201', async () => {
    // Collection with no existing "summary" field
    const colNoSummary = {
      ...mockCollection,
      schema: JSON.stringify({ type: 'object', properties: { title: { type: 'string', title: 'Title' } }, required: [] }),
    }
    const { db } = makeMockDb({ collectionFirst: colNoSummary })
    const app = createApp()
    const res = await app.request('/api/admin/collections/col1/fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldName: 'summary', fieldLabel: 'Summary', fieldType: 'text' }),
    }, { DB: db, CACHE_KV: mockCacheKV })
    expect(res.status).toBe(201)
    const json = await res.json() as any
    expect(json).toHaveProperty('message')
    expect(json).toHaveProperty('id', 'schema-summary')
  })

  it('returns 422 when fieldName has invalid chars', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/collections/col1/fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldName: 'My Field!', fieldLabel: 'My Field', fieldType: 'text' }),
    }, baseEnv)
    expect(res.status).toBe(422)
  })

  it('returns 409 when field already exists', async () => {
    // Collection with schema that already has "title" field
    const app = createApp()
    const res = await app.request('/api/admin/collections/col1/fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldName: 'title', fieldLabel: 'Title', fieldType: 'text' }),
    }, baseEnv)
    expect(res.status).toBe(409)
    const json = await res.json() as any
    expect(json.error).toMatch(/already exists/)
  })

  it('returns 422 on missing required fields', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/collections/col1/fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldName: 'summary' }),
    }, baseEnv)
    expect(res.status).toBe(422)
  })
})

// ──────────────────────────────────────────────
// PUT /:id/fields/:fieldId
// ──────────────────────────────────────────────
describe('PUT /api/admin/collections/:id/fields/:fieldId', () => {
  it('updates a schema field (schema- prefix)', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/collections/col1/fields/schema-title', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldLabel: 'Updated Title' }),
    }, baseEnv)
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('message')
  })

  it('returns 404 when collection not found', async () => {
    const { db } = makeMockDb({ collectionFirst: null })
    const app = createApp()
    const res = await app.request('/api/admin/collections/unknown/fields/schema-title', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldLabel: 'Title' }),
    }, { DB: db, CACHE_KV: mockCacheKV })
    expect(res.status).toBe(404)
  })

  it('returns 404 for non-schema field ids', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/collections/col1/fields/field1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldLabel: 'Title' }),
    }, baseEnv)
    expect(res.status).toBe(404)
  })
})

// ──────────────────────────────────────────────
// DELETE /:id/fields/:fieldId
// ──────────────────────────────────────────────
describe('DELETE /api/admin/collections/:id/fields/:fieldId', () => {
  it('deletes a schema field (schema- prefix)', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/collections/col1/fields/schema-title', {
      method: 'DELETE',
    }, baseEnv)
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('message')
  })

  it('returns 404 when schema field not found', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/collections/col1/fields/schema-nonexistent', {
      method: 'DELETE',
    }, baseEnv)
    expect(res.status).toBe(404)
  })

  it('returns 404 for non-schema field ids', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/collections/col1/fields/field1', {
      method: 'DELETE',
    }, baseEnv)
    expect(res.status).toBe(404)
  })
})
