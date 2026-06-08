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
    r2_key: 'media-1.png',
    public_url: '/files/media-1.png',
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
    r2_key: 'media-2.pdf',
    public_url: '/files/media-2.pdf',
    thumbnail_url: null,
    alt: null,
    caption: null,
    tags: null,
    uploaded_by: 'u1',
    uploaded_at: 1700000001,
    deleted_at: null,
  },
]

function createDb(activeReferences: Record<string, Array<{ content_id: string; title: string; usage_type: string }>> = {}) {
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
          if (sql.includes('content_media_references')) return { results: activeReferences[String(args[0])] ?? [] }
          if (sql.includes('SELECT * FROM media')) return { results: [mediaRows[0]] }
          if (sql.includes('GROUP BY type')) return { results: [{ type: 'images', count: 1 }, { type: 'audio', count: 1 }, { type: 'other', count: 1 }] }
          return { results: [] }
        },
        run: async () => {
          calls.push({ sql, args })
          return {}
        },
      }),
      all: async () => {
        calls.push({ sql, args: [] })
        if (sql.includes('GROUP BY type')) return { results: [{ type: 'images', count: 1 }, { type: 'audio', count: 1 }, { type: 'other', count: 1 }] }
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

function createEnv(activeReferences: Record<string, Array<{ content_id: string; title: string; usage_type: string }>> = {}) {
  const { db, calls } = createDb(activeReferences)
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
  it('lists media with search, type, pagination, and type stats', async () => {
    const app = createApp()
    const { env, calls } = createEnv()
    const res = await app.request('/api/media?page=2&limit=10&type=images&search=hero', {}, env)

    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json.items[0]).toMatchObject({
      id: 'media-1',
      publicUrl: '/files/media-1.png',
      tags: ['hero'],
      isImage: true,
      isAudio: false,
      isOther: false,
    })
    expect(json.types).toContainEqual({ type: 'audio', count: 1 })
    expect(json.types).toContainEqual({ type: 'other', count: 1 })
    expect(json.page).toBe(2)
    expect(json.limit).toBe(10)
    expect(json.folders).toBeUndefined()
    expect(calls.some((call) => call.sql.includes('mime_type LIKE ?') && call.args.includes('image/%'))).toBe(true)
    expect(calls.some((call) => call.sql.includes('folder'))).toBe(false)
    expect(calls.some((call) => call.args.includes(10) && call.args.includes(10))).toBe(true)
  })

  it('filters audio, documents, and other media separately', async () => {
    const app = createApp()
    const { env, calls } = createEnv()

    const audio = await app.request('/api/media?type=audio', {}, env)
    const documents = await app.request('/api/media?type=documents', {}, env)
    const other = await app.request('/api/media?type=other', {}, env)

    expect(audio.status).toBe(200)
    expect(documents.status).toBe(200)
    expect(other.status).toBe(200)
    expect(calls.some((call) => call.sql.includes('mime_type LIKE ?') && call.args.includes('audio/%'))).toBe(true)
    expect(calls.some((call) => call.sql.includes('mime_type IN') && call.args.includes('application/pdf'))).toBe(true)
    expect(calls.some((call) => call.sql.includes('mime_type NOT IN') && call.args.includes('application/pdf'))).toBe(true)
  })

  it('uploads multiple files to flat R2 keys', async () => {
    const app = createApp()
    const { env, bucket, calls } = createEnv()
    const fd = new FormData()
    fd.append('files', new File(['img'], 'photo.png', { type: 'image/png' }))

    const res = await app.request('/api/media/upload-multiple', { method: 'POST', body: fd }, env)
    const json = await res.json() as any

    expect(res.status).toBe(201)
    expect(json.summary.successful).toBe(1)
    expect(json.uploaded[0].publicUrl).toMatch(/^\/files\/[^/]+\.png$/)
    expect(bucket.put).toHaveBeenCalledWith(expect.not.stringContaining('/'), expect.any(ArrayBuffer), expect.any(Object))
    expect(calls.some((call) => call.sql.includes('INSERT INTO media') && call.sql.includes('folder'))).toBe(false)
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
      body: JSON.stringify({ alt: 'New alt', caption: 'Caption', tags: ['hero', 'cover'] }),
    }, env)

    expect(res.status).toBe(200)
    const update = calls.find((call) => call.sql.includes('UPDATE media SET'))
    expect(update?.sql).toContain('alt = ?')
    expect(update?.sql).toContain('caption = ?')
    expect(update?.sql).toContain('tags = ?')
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
    expect(bucket.delete).toHaveBeenCalledWith('media-1.png')
    expect(bucket.delete).toHaveBeenCalledWith('media-2.pdf')
    expect(calls.filter((call) => call.sql.includes('SET deleted_at = ?'))).toHaveLength(2)
  })

  it('blocks single delete when media is referenced by active content', async () => {
    const app = createApp()
    const { env, bucket } = createEnv({
      'media-1': [{ content_id: 'content-1', title: 'Post title', usage_type: 'body' }],
    })

    const res = await app.request('/api/media/media-1', { method: 'DELETE' }, env)
    const json = await res.json() as any

    expect(res.status).toBe(409)
    expect(json).toEqual({
      error: 'Media is in use',
      details: {
        count: 1,
        references: [{ contentId: 'content-1', title: 'Post title', usageType: 'body' }],
      },
    })
    expect(bucket.delete).not.toHaveBeenCalled()
  })

  it('reports referenced media in bulk delete errors and deletes unreferenced media', async () => {
    const app = createApp()
    const { env, bucket, calls } = createEnv({
      'media-1': [{ content_id: 'content-1', title: 'Post title', usage_type: 'cover' }],
    })

    const res = await app.request('/api/media/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileIds: ['media-1', 'media-2'] }),
    }, env)
    const json = await res.json() as any

    expect(res.status).toBe(200)
    expect(json.deleted).toEqual([{ fileId: 'media-2', filename: 'guide.pdf', success: true }])
    expect(json.errors).toMatchObject([
      {
        fileId: 'media-1',
        filename: 'hero.png',
        error: 'Media is in use',
        details: {
          count: 1,
          references: [{ contentId: 'content-1', title: 'Post title', usageType: 'cover' }],
        },
      },
    ])
    expect(bucket.delete).toHaveBeenCalledWith('media-2.pdf')
    expect(bucket.delete).not.toHaveBeenCalledWith('media-1.png')
    expect(calls.filter((call) => call.sql.includes('SET deleted_at = ?'))).toHaveLength(1)
  })

  it('does not block delete for references from soft-deleted content', async () => {
    const app = createApp()
    const { env, bucket, calls } = createEnv()

    const res = await app.request('/api/media/media-1', { method: 'DELETE' }, env)

    expect(res.status).toBe(200)
    expect(bucket.delete).toHaveBeenCalledWith('media-1.png')
    expect(calls.some((call) => call.sql.includes('content_media_references') && call.sql.includes('c.deleted_at IS NULL'))).toBe(true)
  })
})
