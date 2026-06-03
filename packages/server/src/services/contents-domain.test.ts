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
  type: 'post',
  title: 'Old Post',
  slug: 'old-post',
  excerpt: null,
  body: '',
  status: 'draft',
  category_id: null,
  metadata: '{}',
  published_at: null,
  author_id: 'user-1',
  created_at: 100,
  updated_at: 100,
  deleted_at: null,
}

describe('content domain creation', () => {
  it('creates admin content with an initial snapshot version', async () => {
    const { db, calls } = createMockDb(() => null)

    const result = await createContent({
      db: db as any,
      mode: 'admin-create',
      input: {
        title: 'New Post',
        slug: 'New Post!',
        type: 'post',
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
    expect(calls.some((call) => call.sql.includes('SELECT id FROM contents WHERE type = ? AND slug = ?'))).toBe(true)
    expect(calls.some((call) => call.sql.includes('INSERT INTO contents'))).toBe(true)
    expect(calls.some((call) => call.args.includes('new-post'))).toBe(true)
    expect(calls.some((call) => call.sql.includes('INSERT INTO content_versions'))).toBe(true)
    const versionCall = calls.find((call) => call.sql.includes('INSERT INTO content_versions'))
    expect(JSON.parse(versionCall?.args[3] as string)).toMatchObject({
      id: 'content-1',
      type: 'post',
      title: 'New Post',
      slug: 'new-post',
      status: 'draft',
      authorId: 'user-1',
    })
  })

  it('returns duplicate slug without inserting content', async () => {
    const { db, calls } = createMockDb((sql) => {
      if (sql.includes('SELECT id FROM contents WHERE type = ? AND slug = ?')) return { id: 'existing' }
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

  it('rejects category and tags on page content', async () => {
    const { db } = createMockDb(() => null)

    const result = await createContent({
      db: db as any,
      mode: 'admin-create',
      input: {
        type: 'page',
        title: 'About',
        status: 'draft',
        categoryId: 'cat-1',
        tagIds: ['tag-1'],
      },
      authorId: 'user-1',
    })

    expect(result).toMatchObject({
      created: false,
      validationError: 'Only post content can have a category',
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
  it('updates admin content and creates a snapshot version when fields change', async () => {
    const { db, calls } = createMockDb((sql) => {
      if (sql.includes('SELECT * FROM contents')) return existingContent
      if (sql.includes('SELECT id FROM contents WHERE type = ? AND slug = ?')) return null
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

  it('returns duplicate slug without updating', async () => {
    const { db, calls } = createMockDb((sql) => {
      if (sql.includes('SELECT * FROM contents')) return existingContent
      if (sql.includes('SELECT id FROM contents WHERE type = ? AND slug = ?')) return { id: 'other' }
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

  it('allows the same slug for a different content type', async () => {
    const { db, calls } = createMockDb((sql, args) => {
      if (sql.includes('SELECT * FROM contents')) return existingContent
      if (sql.includes('SELECT id FROM contents WHERE type = ? AND slug = ?')) {
        expect(args[0]).toBe('page')
        return null
      }
      if (sql.includes('SELECT MAX(version)')) return { max_version: 1 }
      return null
    })

    const result = await updateContent({
      db: db as any,
      id: 'content-1',
      mode: 'admin-update',
      patch: { type: 'page', slug: 'old-post' },
      authorId: 'user-2',
    })

    expect(result.found).toBe(true)
    expect(result.duplicateSlug).toBeUndefined()
    expect(calls.some((call) => call.sql.includes('UPDATE contents'))).toBe(true)
  })
})

describe('content domain version restore', () => {
  it('restores a snapshot and writes a new version', async () => {
    const snapshot = {
      id: 'content-1',
      type: 'post',
      title: 'Restored title',
      slug: 'restored-title',
      excerpt: null,
      body: '',
      status: 'draft',
      categoryId: null,
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
