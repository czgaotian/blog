import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../middleware', () => ({
  requireAuth: () => async (_c: any, next: any) => { await next() },
}))

import { apiMediaRoutes } from './api-media'

const mediaRows = [
  {
    id: 'media-1',
    filename: 'media-1.png',
    original_name: 'hero.png',
    mime_type: 'image/png',
    size: 2048,
    width: 640,
    height: 480,
    folder: 'uploads',
    r2_key: 'uploads/media-1.png',
    public_url: '/files/uploads/media-1.png',
    thumbnail_url: null,
    alt: 'Hero',
    caption: null,
    tags: '["hero"]',
    uploaded_by: 'u1',
    uploaded_at: 1700000000,
    deleted_at: null,
  },
  {
    id: 'media-2',
    filename: 'media-2.pdf',
    original_name: 'guide.pdf',
    mime_type: 'application/pdf',
    size: 4096,
    width: null,
    height: null,
    folder: 'docs',
    r2_key: 'docs/media-2.pdf',
    public_url: '/files/docs/media-2.pdf',
    thumbnail_url: null,
    alt: null,
    caption: null,
    tags: null,
    uploaded_by: 'u1',
    uploaded_at: 1700000001,
    deleted_at: null,
  },
]

function createDb() {
  const calls: Array<{ sql: string; args: unknown[] }> = []
  const db = {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        first: async () => {
          calls.push({ sql, args })
          if (sql.includes('COUNT(*) as count FROM media')) return { count: 1 }
          if (sql.includes('WHERE id = ?')) return mediaRows.find((row) => row.id === args[0]) ?? null
          return null
        },
        all: async () => {
          calls.push({ sql, args })
          if (sql.includes('SELECT * FROM media')) return { results: [mediaRows[0]] }
          if (sql.includes('GROUP BY folder')) return { results: [{ folder: 'uploads', count: 1, totalSize: 2048 }] }
          if (sql.includes('GROUP BY type')) return { results: [{ type: 'images', count: 1 }] }
          return { results: [] }
        },
        run: async () => {
          calls.push({ sql, args })
          return {}
        },
      }),
      all: async () => {
        calls.push({ sql, args: [] })
        if (sql.includes('GROUP BY folder')) return { results: [{ folder: 'uploads', count: 1, totalSize: 2048 }] }
        if (sql.includes('GROUP BY type')) return { results: [{ type: 'images', count: 1 }] }
        return { results: [] }
      },
    }),
  }
  return { db, calls }
}

function createApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', { userId: 'u1', email: 'admin@test.com', role: 'admin', exp: 0, iat: 0 })
    await next()
  })
  app.route('/api/media', apiMediaRoutes)
  return app
}

function createEnv() {
  const { db, calls } = createDb()
  const bucket = {
    put: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({
      body: new ReadableStream(),
      httpMetadata: { contentType: 'image/png' },
      customMetadata: { originalName: 'hero.png' },
    }),
    delete: vi.fn().mockResolvedValue(undefined),
  }
  return { env: { DB: db, MEDIA_BUCKET: bucket }, calls, bucket }
}

describe('/api/media', () => {
  it('lists media with search, type, folder, pagination, and stats', async () => {
    const app = createApp()
    const { env, calls } = createEnv()
    const res = await app.request('/api/media?page=2&limit=10&type=images&folder=uploads&search=hero', {}, env)

    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json.items[0]).toMatchObject({
      id: 'media-1',
      publicUrl: '/files/uploads/media-1.png',
      tags: ['hero'],
      isImage: true,
    })
    expect(json.page).toBe(2)
    expect(json.limit).toBe(10)
    expect(json.folders[0]).toEqual({ folder: 'uploads', count: 1, totalSize: 2048 })
    expect(calls.some((call) => call.sql.includes('mime_type LIKE ?') && call.args.includes('image/%'))).toBe(true)
    expect(calls.some((call) => call.args.includes(10) && call.args.includes(10))).toBe(true)
  })

  it('uploads multiple files to the selected virtual folder', async () => {
    const app = createApp()
    const { env, bucket, calls } = createEnv()
    const fd = new FormData()
    fd.append('files', new File(['img'], 'photo.png', { type: 'image/png' }))
    fd.append('folder', 'gallery')

    const res = await app.request('/api/media/upload-multiple', { method: 'POST', body: fd }, env)
    const json = await res.json() as any

    expect(res.status).toBe(201)
    expect(json.summary.successful).toBe(1)
    expect(json.uploaded[0].publicUrl).toContain('/files/gallery/')
    expect(bucket.put).toHaveBeenCalledWith(expect.stringMatching(/^gallery\//), expect.any(ArrayBuffer), expect.any(Object))
    expect(calls.some((call) => call.sql.includes('INSERT INTO media') && call.args.includes('gallery'))).toBe(true)
  })

  it('stores an ASCII-safe content disposition for unicode filenames', async () => {
    const app = createApp()
    const { env, bucket } = createEnv()
    const fd = new FormData()
    fd.append('files', new File(['img'], '截图 2026-05-28 22-38-40.png', { type: 'image/png' }))

    const res = await app.request('/api/media/upload-multiple', { method: 'POST', body: fd }, env)
    const options = bucket.put.mock.calls[0][2]
    const contentDisposition = options.httpMetadata.contentDisposition

    expect(res.status).toBe(201)
    expect(contentDisposition).toBe(
      `inline; filename="2026-05-28-22-38-40.png"; filename*=UTF-8''${encodeURIComponent('截图 2026-05-28 22-38-40.png')}`,
    )
    expect(contentDisposition).toMatch(/^[\x00-\x7F]+$/)
  })

  it('updates only media metadata fields', async () => {
    const app = createApp()
    const { env, calls } = createEnv()
    const res = await app.request('/api/media/media-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alt: 'New alt', caption: 'Caption', tags: ['hero', 'cover'], folder: 'ignored' }),
    }, env)

    expect(res.status).toBe(200)
    const update = calls.find((call) => call.sql.includes('UPDATE media SET'))
    expect(update?.sql).toContain('alt = ?')
    expect(update?.sql).toContain('caption = ?')
    expect(update?.sql).toContain('tags = ?')
    expect(update?.sql).not.toContain('folder = ?')
  })

  it('bulk moves media through R2 and database updates', async () => {
    const app = createApp()
    const { env, bucket, calls } = createEnv()
    const res = await app.request('/api/media/bulk-move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileIds: ['media-1'], folder: 'archive' }),
    }, env)
    const json = await res.json() as any

    expect(res.status).toBe(200)
    expect(json.summary.successful).toBe(1)
    expect(bucket.get).toHaveBeenCalledWith('uploads/media-1.png')
    expect(bucket.put).toHaveBeenCalledWith('archive/media-1.png', expect.any(ReadableStream), expect.any(Object))
    expect(bucket.delete).toHaveBeenCalledWith('uploads/media-1.png')
    expect(calls.some((call) => call.sql.includes('SET folder = ?') && call.args.includes('/files/archive/media-1.png'))).toBe(true)
  })

  it('single and bulk delete soft-delete records and delete R2 objects', async () => {
    const app = createApp()
    const { env, bucket, calls } = createEnv()
    const single = await app.request('/api/media/media-1', { method: 'DELETE' }, env)
    const bulk = await app.request('/api/media/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileIds: ['media-2'] }),
    }, env)

    expect(single.status).toBe(200)
    expect(bulk.status).toBe(200)
    expect(bucket.delete).toHaveBeenCalledWith('uploads/media-1.png')
    expect(bucket.delete).toHaveBeenCalledWith('docs/media-2.pdf')
    expect(calls.filter((call) => call.sql.includes('SET deleted_at = ?'))).toHaveLength(2)
  })
})
