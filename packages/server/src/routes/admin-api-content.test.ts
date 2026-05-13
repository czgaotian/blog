import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../middleware', () => ({
  requireAuth: () => async (_c: any, next: any) => { await next() },
  requireRole: () => async (_c: any, next: any) => { await next() },
}))

const mockContent = {
  id: 'c1', title: 'Test Post', slug: 'test-post', status: 'draft',
  data: '{"title":"Test Post"}', collection_id: 'col1',
  collection_name: 'blog_posts', collection_display_name: 'Blog Posts',
  author_id: 'u1', first_name: 'Admin', last_name: 'User', author_email: 'admin@test.com',
  created_at: 1700000000000, updated_at: 1700000000000,
}

const mockDb: any = {
  prepare: (sql: string) => ({
    bind: (..._args: any[]) => ({
      first: async () => {
        if (sql.includes('COUNT(*)')) return { count: 1 }
        if (sql.includes('content_versions') && sql.includes('MAX(version)')) return { max_version: 1 }
        if (sql.includes('content_fields')) return null
        if (sql.includes('SELECT schema FROM collections')) return { schema: null }
        return mockContent
      },
      all: async () => {
        if (sql.includes('content_fields') || sql.includes('content_versions cv')) return { results: [] }
        return { results: [mockContent] }
      },
      run: async () => ({}),
    }),
    first: async () => mockContent,
    all: async () => ({ results: [mockContent] }),
    run: async () => ({}),
  }),
}

import { adminApiContentRoutes } from './admin-api-content'

function createApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', { userId: 'u1', email: 'admin@test.com', role: 'admin', exp: 0, iat: 0 })
    await next()
  })
  app.route('/api/admin/content', adminApiContentRoutes)
  return app
}

describe('GET /api/admin/content', () => {
  it('returns content list', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/content', {}, { DB: mockDb })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('items')
    expect(json).toHaveProperty('total')
    expect(json).toHaveProperty('page')
    expect(json).toHaveProperty('limit')
    expect(json.items[0].title).toBe('Test Post')
  })

  it('returns 401 when unauthenticated', async () => {
    const app = new Hono()
    app.route('/api/admin/content', adminApiContentRoutes)
    const res = await app.request('/api/admin/content', {}, { DB: mockDb })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/admin/content/:id', () => {
  it('returns single content item with fields', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/content/c1', {}, { DB: mockDb })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('id', 'c1')
    expect(json).toHaveProperty('fields')
    expect(json).toHaveProperty('data')
  })
})

describe('POST /api/admin/content', () => {
  it('creates content with valid body', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collectionId: 'col1',
        title: 'New Post',
        status: 'draft',
        data: {},
      }),
    }, { DB: mockDb })
    expect(res.status).toBe(201)
    const json = await res.json() as any
    expect(json).toHaveProperty('message')
    expect(json).toHaveProperty('id')
  })

  it('returns 422 for missing required fields', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    }, { DB: mockDb })
    expect(res.status).toBe(422)
  })
})

describe('PUT /api/admin/content/:id', () => {
  it('updates content', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/content/c1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated Post' }),
    }, { DB: mockDb })
    expect(res.status).toBe(200)
  })
})

describe('DELETE /api/admin/content/:id', () => {
  it('soft-deletes content', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/content/c1', {
      method: 'DELETE',
    }, { DB: mockDb })
    expect(res.status).toBe(200)
  })
})

describe('GET /api/admin/content/:id/versions', () => {
  it('returns versions list', async () => {
    const app = createApp()
    const res = await app.request('/api/admin/content/c1/versions', {}, { DB: mockDb })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('versions')
  })
})
