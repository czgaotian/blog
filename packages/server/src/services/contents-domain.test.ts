import { describe, expect, it, vi } from 'vitest'
import {
  createContent,
  deleteContent,
  restoreContentVersion,
  updateContent,
} from './contents-domain'

function createMockDb(firstBySql: (sql: string, args: any[]) => any = () => null) {
  const calls: Array<{ sql: string; args: any[] }> = []
  const db = {
    prepare: vi.fn((sql: string) => ({
      bind: (...args: any[]) => {
        calls.push({ sql, args })
        return {
          first: async () => firstBySql(sql, args),
          all: async () => ({ results: [] }),
          run: async () => ({ success: true }),
        }
      },
    })),
  }

  return { db, calls }
}

const existingContent = {
  id: 'content-1',
  title: 'Old Post',
  slug: 'old-post',
  excerpt: null,
  body_json: JSON.stringify({ type: 'doc', content: [] }),
  body_html: '',
  status: 'draft',
  category_id: null,
  cover_image_id: null,
  metadata: '{}',
  published_at: null,
  author_id: 'user-1',
  created_at: 100,
  updated_at: 100,
  deleted_at: null,
}

describe('content domain creation', () => {
  it('creates body and cover media references without duplicate body entries', async () => {
    const { db, calls } = createMockDb((sql, args) => {
      if (sql.includes('SELECT id FROM media')) return { id: args[0] }
      if (sql.includes('COUNT(*) as count FROM media')) return { count: args.length }
      return null
    })

    const result = await createContent({
      db: db as any,
      mode: 'admin-create',
      input: {
        title: 'Media post',
        status: 'draft',
        coverImageId: 'media-1',
        bodyJson: {
          type: 'doc',
          content: [
            { type: 'image', attrs: { src: '/files/media-1.png', mediaId: 'media-1' } },
            { type: 'image', attrs: { src: '/files/media-1.png', mediaId: 'media-1' } },
          ],
        },
      },
      authorId: 'user-1',
      id: 'content-1',
      now: 123,
    })

    expect(result.created).toBe(true)
    const referenceCalls = calls.filter((call) => call.sql.includes('INSERT INTO content_media_references'))
    expect(referenceCalls).toHaveLength(2)
    expect(referenceCalls.map((call) => call.args.slice(0, 3))).toEqual([
      ['content-1', 'media-1', 'body'],
      ['content-1', 'media-1', 'cover'],
    ])
  })

  it('rejects missing body media without inserting content', async () => {
    const { db, calls } = createMockDb((sql) => {
      if (sql.includes('COUNT(*) as count FROM media')) return { count: 0 }
      return null
    })

    const result = await createContent({
      db: db as any,
      mode: 'admin-create',
      input: {
        title: 'Broken media post',
        status: 'draft',
        bodyJson: {
          type: 'doc',
          content: [
            { type: 'image', attrs: { src: '/files/missing.png', mediaId: 'missing-media' } },
          ],
        },
      },
      authorId: 'user-1',
      id: 'content-1',
      now: 123,
    })

    expect(result).toMatchObject({
      created: false,
      validationError: 'One or more body media items were not found',
    })
    expect(calls.some((call) => call.sql.includes('INSERT INTO contents'))).toBe(false)
  })

  it('creates admin content with an initial snapshot version', async () => {
    const { db, calls } = createMockDb(() => null)

    const result = await createContent({
      db: db as any,
      mode: 'admin-create',
      input: {
        title: 'New Post',
        slug: 'New Post!',
        status: 'draft',
      },
      authorId: 'user-1',
      id: 'content-1',
      now: 123,
    })

    expect(result).toEqual({
      created: true,
      id: 'content-1',
      mode: 'admin-create',
    })
    expect(calls.some((call) => call.sql.includes('SELECT id FROM contents WHERE slug = ?'))).toBe(true)
    expect(calls.some((call) => call.sql.includes('INSERT INTO contents'))).toBe(true)
    expect(calls.some((call) => call.args.includes('new-post'))).toBe(true)
    expect(calls.some((call) => call.sql.includes('INSERT INTO content_versions'))).toBe(true)
    const versionCall = calls.find((call) => call.sql.includes('INSERT INTO content_versions'))
    expect(JSON.parse(versionCall?.args[3] as string)).toMatchObject({
      id: 'content-1',
      title: 'New Post',
      slug: 'new-post',
      status: 'draft',
      bodyJson: { type: 'doc', content: [] },
      authorId: 'user-1',
      coverImageId: null,
    })
  })

  it('renders cached HTML when creating published content', async () => {
    const { db, calls } = createMockDb(() => null)

    const result = await createContent({
      db: db as any,
      mode: 'admin-create',
      input: {
        title: 'Published Post',
        status: 'published',
        bodyJson: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello <script>alert(1)</script>' }] }],
        },
      },
      authorId: 'user-1',
      id: 'content-1',
      now: 123,
    })

    expect(result.created).toBe(true)
    const insertCall = calls.find((call) => call.sql.includes('INSERT INTO contents'))
    expect(insertCall?.args[4]).toContain('"type":"doc"')
    expect(insertCall?.args[5]).toBe('<p>Hello &lt;script&gt;alert(1)&lt;/script&gt;</p>')
  })

  it('returns duplicate slug without inserting content', async () => {
    const { db, calls } = createMockDb((sql) => {
      if (sql.includes('SELECT id FROM contents WHERE slug = ?')) return { id: 'existing' }
      return null
    })

    const result = await createContent({
      db: db as any,
      mode: 'headless-create',
      input: {
        title: 'New Post',
        status: 'draft',
      },
      authorId: 'user-1',
    })

    expect(result).toEqual({
      created: false,
      duplicateSlug: true,
      mode: 'headless-create',
    })
    expect(calls.some((call) => call.sql.includes('INSERT INTO contents'))).toBe(false)
  })

  it('accepts category and tags', async () => {
    const { db, calls } = createMockDb((sql) => {
      if (sql.includes('SELECT id FROM categories WHERE id = ?')) return { id: 'cat-1' }
      if (sql.includes('SELECT COUNT(*) as count FROM tags')) return { count: 1 }
      return null
    })

    const result = await createContent({
      db: db as any,
      mode: 'admin-create',
      input: {
        title: 'About',
        status: 'draft',
        categoryId: 'cat-1',
        tagIds: ['tag-1'],
      },
      authorId: 'user-1',
    })

    expect(result.created).toBe(true)
    expect(calls.some((call) => call.sql.includes('INSERT INTO content_tags'))).toBe(true)
  })

  it('accepts an existing cover image', async () => {
    const { db, calls } = createMockDb((sql) => {
      if (sql.includes('SELECT id FROM media')) return { id: 'media-1' }
      return null
    })

    const result = await createContent({
      db: db as any,
      mode: 'admin-create',
      input: {
        title: 'Covered content',
        status: 'draft',
        coverImageId: 'media-1',
      },
      authorId: 'user-1',
    })

    expect(result.created).toBe(true)
    expect(calls.some((call) => call.args.includes('media-1'))).toBe(true)
  })

  it('rejects a missing cover image', async () => {
    const { db } = createMockDb(() => null)

    const result = await createContent({
      db: db as any,
      mode: 'admin-create',
      input: {
        title: 'Missing cover',
        status: 'draft',
        coverImageId: 'missing-media',
      },
      authorId: 'user-1',
    })

    expect(result).toMatchObject({
      created: false,
      validationError: 'Cover image not found',
    })
  })
})

describe('content domain deletion', () => {
  it('soft deletes admin content and invalidates cache', async () => {
    const { db, calls } = createMockDb(() => ({ id: 'content-1' }))

    const result = await deleteContent({
      db: db as any,
      id: 'content-1',
      mode: 'admin-soft',
      now: 123,
    })

    expect(result).toEqual({
      found: true,
      id: 'content-1',
      mode: 'admin-soft',
    })
    expect(calls.some((call) => call.sql.includes("UPDATE contents SET status = 'deleted'"))).toBe(true)
    expect(calls.some((call) => call.sql.includes('DELETE FROM content_media_references'))).toBe(true)
  })

  it('returns not found without mutating content', async () => {
    const { db, calls } = createMockDb(() => null)

    const result = await deleteContent({
      db: db as any,
      id: 'missing',
      mode: 'admin-soft',
    })

    expect(result).toEqual({
      found: false,
      id: 'missing',
      mode: 'admin-soft',
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.sql).toContain('SELECT id FROM contents')
  })
})

describe('content domain update', () => {
  it('replaces media references when updating content', async () => {
    const { db, calls } = createMockDb((sql, args) => {
      if (sql.includes('SELECT * FROM contents')) return existingContent
      if (sql.includes('SELECT id FROM contents WHERE slug = ?')) return null
      if (sql.includes('COUNT(*) as count FROM media')) return { count: args.length }
      if (sql.includes('SELECT MAX(version)')) return { max_version: 1 }
      return null
    })

    const result = await updateContent({
      db: db as any,
      id: 'content-1',
      mode: 'admin-update',
      patch: {
        bodyJson: {
          type: 'doc',
          content: [
            { type: 'image', attrs: { src: '/files/media-2.png', mediaId: 'media-2' } },
          ],
        },
      },
      authorId: 'user-2',
      now: 456,
    })

    expect(result.found).toBe(true)
    expect(calls.some((call) => call.sql.includes('DELETE FROM content_media_references'))).toBe(true)
    const referenceCall = calls.find((call) => call.sql.includes('INSERT INTO content_media_references'))
    expect(referenceCall?.args.slice(0, 3)).toEqual(['content-1', 'media-2', 'body'])
  })

  it('updates admin content and creates a snapshot version when fields change', async () => {
    const { db, calls } = createMockDb((sql) => {
      if (sql.includes('SELECT * FROM contents')) return existingContent
      if (sql.includes('SELECT id FROM contents WHERE slug = ?')) return null
      if (sql.includes('SELECT MAX(version)')) return { max_version: 1 }
      return null
    })

    const result = await updateContent({
      db: db as any,
      id: 'content-1',
      mode: 'admin-update',
      patch: {
        title: 'Updated Post',
        slug: 'updated-post',
      },
      authorId: 'user-2',
      now: 456,
    })

    expect(result).toEqual({
      found: true,
      id: 'content-1',
      mode: 'admin-update',
      versionCreated: true,
    })
    expect(calls.some((call) => call.sql.includes('UPDATE contents'))).toBe(true)
    expect(calls.some((call) => call.sql.includes('INSERT INTO content_versions'))).toBe(true)
  })

  it('regenerates cached HTML when publishing updated JSON', async () => {
    const { db, calls } = createMockDb((sql) => {
      if (sql.includes('SELECT * FROM contents')) return existingContent
      if (sql.includes('SELECT id FROM contents WHERE slug = ?')) return null
      if (sql.includes('SELECT MAX(version)')) return { max_version: 1 }
      return null
    })

    const result = await updateContent({
      db: db as any,
      id: 'content-1',
      mode: 'admin-update',
      patch: {
        status: 'published',
        bodyJson: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Published' }] }],
        },
      },
      authorId: 'user-2',
      now: 456,
    })

    expect(result.found).toBe(true)
    const updateCall = calls.find((call) => call.sql.includes('UPDATE contents'))
    expect(updateCall?.args[3]).toContain('"type":"doc"')
    expect(updateCall?.args[4]).toBe('<p>Published</p>')
  })

  it('returns duplicate slug without updating', async () => {
    const { db, calls } = createMockDb((sql) => {
      if (sql.includes('SELECT * FROM contents')) return existingContent
      if (sql.includes('SELECT id FROM contents WHERE slug = ?')) return { id: 'other' }
      return null
    })

    const result = await updateContent({
      db: db as any,
      id: 'content-1',
      mode: 'admin-update',
      patch: { slug: 'taken' },
      authorId: 'user-2',
    })

    expect(result).toEqual({
      found: true,
      id: 'content-1',
      mode: 'admin-update',
      duplicateSlug: true,
    })
    expect(calls.some((call) => call.sql.includes('UPDATE contents SET'))).toBe(false)
  })

})

describe('content domain version restore', () => {
  it('restores a snapshot and writes a new version', async () => {
    const snapshot = {
      id: 'content-1',
      title: 'Restored title',
      slug: 'restored-title',
      excerpt: null,
      bodyJson: {
        type: 'doc',
        content: [
          { type: 'image', attrs: { src: '/files/media-3.png', mediaId: 'media-3' } },
        ],
      },
      status: 'draft',
      categoryId: null,
      coverImageId: null,
      tagIds: [],
      metadata: {},
      publishedAt: null,
      authorId: 'user-1',
      createdAt: new Date(100).toISOString(),
      updatedAt: new Date(100).toISOString(),
      deletedAt: null,
    }
    const { db, calls } = createMockDb((sql) => {
      if (sql.includes('SELECT data FROM content_versions')) return { data: JSON.stringify(snapshot) }
      if (sql.includes('COUNT(*) as count FROM media')) return { count: 1 }
      if (sql.includes('SELECT MAX(version)')) return { max_version: 2 }
      return null
    })

    const result = await restoreContentVersion({
      db: db as any,
      id: 'content-1',
      version: 2,
      authorId: 'user-2',
      now: 456,
    })

    expect(result).toEqual({
      restored: true,
      id: 'content-1',
      version: 2,
    })
    expect(calls.some((call) => call.sql.includes('UPDATE contents'))).toBe(true)
    expect(calls.some((call) => call.sql.includes('INSERT INTO content_versions'))).toBe(true)
    const referenceCall = calls.find((call) => call.sql.includes('INSERT INTO content_media_references'))
    expect(referenceCall?.args.slice(0, 3)).toEqual(['content-1', 'media-3', 'body'])
  })

  it('returns not restored for a missing version without mutation', async () => {
    const { db, calls } = createMockDb(() => null)

    const result = await restoreContentVersion({
      db: db as any,
      id: 'content-1',
      version: 99,
      authorId: 'user-2',
    })

    expect(result).toEqual({
      restored: false,
      id: 'content-1',
      version: 99,
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.sql).toContain('SELECT data FROM content_versions')
  })
})
