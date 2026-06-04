import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../middleware', () => ({
  requireAuth: () => async (_c: any, next: any) => { await next() },
  requireRole: () => async (_c: any, next: any) => { await next() },
}))

const mockContent = {
  id: 'c1', title: 'Test Post', slug: 'test-post', excerpt: null, body: '',
  status: 'draft', category_id: null, metadata: '{}',
  published_at: null,
  author_id: 'u1', first_name: 'Admin', last_name: 'User', author_email: 'admin@test.com',
  created_at: 1700000000000, updated_at: 1700000000000,
}

const mockDb: any = {
  prepare: (sql: string) => ({
    bind: (..._args: any[]) => ({
      first: async () => {
        if (sql.includes('COUNT(*)')) return { count: 1 }
        if (sql.includes('content_versions') && sql.includes('MAX(version)')) return { max_version: 1 }
        if (sql.includes('SELECT id FROM contents WHERE slug = ?')) {
          return null
        }
        if (sql.includes('SELECT id FROM categories WHERE id = ?')) return null
        if (sql.includes('SELECT id FROM contents WHERE id = ?')) return mockContent
        if (sql.includes('SELECT * FROM contents WHERE id = ?')) return mockContent
        return mockContent
      },
      all: async () => {
        if (sql.includes('content_versions cv')) return { results: [] }
        if (sql.includes('content_tags')) return { results: [] }
        return { results: [mockContent] }
      },
      run: async () => ({}),
    }),
    first: async () => mockContent,
    all: async () => ({ results: [mockContent] }),
    run: async () => ({}),
  }),
}

import { adminApiContentsRoutes } from './admin-api-contents'

function createApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', { userId: 'u1', email: 'admin@test.com', role: 'admin', exp: 0, iat: 0 })
    await next()
  })
  app.route('/api/admin/contents', adminApiContentsRoutes)
  return app
}

describe('GET /api/admin/contents', () => {
  it('returns content list', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/contents', {}, { DB: mockDb })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('items')
    expect(json).toHaveProperty('total')
    expect(json).toHaveProperty('page')
    expect(json).toHaveProperty('limit')
    expect(json.items[0].title).toBe('Test Post')
    expect(json.items[0]).not.toHaveProperty('type')
  })

  it('returns 401 when unauthenticated', async () => {
    const app = new Hono()
    app.route('/api/admin/contents', adminApiContentsRoutes)
    const res = await app.request('/api/admin/contents', {}, { DB: mockDb })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/admin/contents/:id', () => {
  it('returns single content item', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/contents/c1', {}, { DB: mockDb })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('id', 'c1')
    expect(json).not.toHaveProperty('type')
    expect(json).toHaveProperty('publishedAt', null)
    expect(json).toHaveProperty('metadata')
    expect(json).not.toHaveProperty('fields')
    expect(json).not.toHaveProperty('data')
  })
})

describe('POST /api/admin/contents', () => {
  it('creates content with valid body', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/contents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Post',
        status: 'draft',
      }),
    }, { DB: mockDb })
    expect(res.status).toBe(201)
    const json = await res.json() as any
    expect(json).toHaveProperty('message')
    expect(json).toHaveProperty('id')
  })

  it('returns 422 for missing required fields', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/contents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    }, { DB: mockDb })
    expect(res.status).toBe(422)
  })

})

describe('PUT /api/admin/contents/:id', () => {
  it('updates content', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/contents/c1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Post' }),
    }, { DB: mockDb })
    expect(res.status).toBe(200)
  })

})

describe('DELETE /api/admin/contents/:id', () => {
  it('soft-deletes content', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/contents/c1', {
      method: 'DELETE',
    }, { DB: mockDb })
    expect(res.status).toBe(200)
  })
})

describe('GET /api/admin/contents/:id/versions', () => {
  it('returns versions list', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/contents/c1/versions', {}, { DB: mockDb })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('versions')
  })
})
