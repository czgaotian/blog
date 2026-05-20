import { describe, expect, it, vi } from 'vitest'
import { createContent, deleteContent, updateContent } from './content-domain'

function createMockDb(existing: any = { id: 'content-1', collection_id: 'collection-1' }) {
  const calls: Array<{ sql: string; args: any[] }> = []
  const db = {
    prepare: vi.fn((sql: string) => ({
      bind: (...args: any[]) => {
        calls.push({ sql, args })
        return {
          first: async () => existing,
          run: async () => ({ success: true }),
        }
      },
    })),
  }

  return { db, calls }
}

describe('content domain creation', () => {
  it('creates admin content with an initial version and invalidates cache', async () => {
    const calls: Array<{ sql: string; args: any[] }> = []
    const db = {
      prepare: vi.fn((sql: string) => ({
        bind: (...args: any[]) => {
          calls.push({ sql, args })
          return {
            first: async () => ({ id: 'collection-1' }),
            run: async () => ({ success: true }),
          }
        },
      })),
    }

    const result = await createContent({
      db: db as any,
      mode: 'admin-create',
      input: {
        collectionId: 'collection-1',
        title: 'New Post',
        slug: 'New Post!',
        status: 'draft',
        data: { body: 'Hello' },
      },
      authorId: 'user-1',
      id: 'content-1',
      now: 123,
    })

    expect(result).toEqual({
      created: true,
      collectionFound: true,
      id: 'content-1',
      collectionId: 'collection-1',
      mode: 'admin-create',
    })
    expect(calls.some((call) => call.sql.includes('SELECT id FROM collections'))).toBe(true)
    expect(calls.some((call) => call.sql.includes('INSERT INTO content ('))).toBe(true)
    expect(calls.some((call) => call.args.includes('new-post'))).toBe(true)
    expect(calls.some((call) => call.args.includes(JSON.stringify({ body: 'Hello', title: 'New Post' })))).toBe(true)
    expect(calls.some((call) => call.sql.includes('INSERT INTO content_versions'))).toBe(true)
  })

  it('returns collection not found without creating admin content', async () => {
    const calls: Array<{ sql: string; args: any[] }> = []
    const db = {
      prepare: vi.fn((sql: string) => ({
        bind: (...args: any[]) => {
          calls.push({ sql, args })
          return {
            first: async () => null,
            run: async () => ({ success: true }),
          }
        },
      })),
    }

    const result = await createContent({
      db: db as any,
      mode: 'admin-create',
      input: {
        collectionId: 'missing',
        title: 'New Post',
        status: 'draft',
        data: {},
      },
      authorId: 'user-1',
    })

    expect(result).toEqual({
      created: false,
      collectionFound: false,
      collectionId: 'missing',
      mode: 'admin-create',
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.sql).toContain('SELECT id FROM collections')
  })

  it('creates headless content without an initial version and checks duplicate slugs', async () => {
    const calls: Array<{ sql: string; args: any[] }> = []
    const db = {
      prepare: vi.fn((sql: string) => ({
        bind: (...args: any[]) => {
          calls.push({ sql, args })
          return {
            first: async () => null,
            run: async () => ({ success: true }),
          }
        },
      })),
    }

    const result = await createContent({
      db: db as any,
      mode: 'headless-create',
      input: {
        collectionId: 'collection-1',
        title: 'New Post',
        slug: ' New Post! ',
        status: 'draft',
        data: { body: 'Hello' },
      },
      authorId: 'user-1',
      id: 'content-1',
      now: 123,
    })

    expect(result.created).toBe(true)
    expect(result.collectionFound).toBe(true)
    expect(result.id).toBe('content-1')
    expect(calls.some((call) => call.sql.includes('SELECT id FROM collections'))).toBe(false)
    expect(calls.some((call) => call.sql.includes('SELECT id FROM content WHERE collection_id = ? AND slug = ?'))).toBe(true)
    expect(calls.some((call) => call.args.includes('-new-post-'))).toBe(true)
    expect(calls.some((call) => call.args.includes(JSON.stringify({ body: 'Hello' })))).toBe(true)
    expect(calls.some((call) => call.sql.includes('INSERT INTO content_versions'))).toBe(false)
  })

  it('returns duplicate slug for headless create without inserting content', async () => {
    const calls: Array<{ sql: string; args: any[] }> = []
    const db = {
      prepare: vi.fn((sql: string) => ({
        bind: (...args: any[]) => {
          calls.push({ sql, args })
          return {
            first: async () => ({ id: 'existing-content' }),
            run: async () => ({ success: true }),
          }
        },
      })),
    }

    const result = await createContent({
      db: db as any,
      mode: 'headless-create',
      input: {
        collectionId: 'collection-1',
        title: 'New Post',
        status: 'draft',
        data: {},
      },
      authorId: 'user-1',
    })

    expect(result).toEqual({
      created: false,
      collectionFound: true,
      duplicateSlug: true,
      collectionId: 'collection-1',
      mode: 'headless-create',
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.sql).toContain('SELECT id FROM content')
  })
})

describe('content domain deletion', () => {
  it('soft deletes admin content', async () => {
    const { db, calls } = createMockDb()

    const result = await deleteContent({
      db: db as any,
      id: 'content-1',
      mode: 'admin-soft',
      now: 123,
    })

    expect(result).toEqual({
      found: true,
      id: 'content-1',
      collectionId: 'collection-1',
      mode: 'admin-soft',
    })
    expect(calls.some((call) => call.sql.includes("UPDATE content SET status = 'deleted'"))).toBe(true)
    expect(calls.some((call) => call.sql.includes('DELETE FROM content'))).toBe(false)
  })

  it('hard deletes headless content', async () => {
    const { db, calls } = createMockDb()

    const result = await deleteContent({
      db: db as any,
      id: 'content-1',
      mode: 'headless-hard',
    })

    expect(result.found).toBe(true)
    expect(result.mode).toBe('headless-hard')
    expect(calls.some((call) => call.sql.includes('DELETE FROM content WHERE id = ?'))).toBe(true)
    expect(calls.some((call) => call.sql.includes("UPDATE content SET status = 'deleted'"))).toBe(false)
  })

  it('returns not found without mutating content', async () => {
    const { db, calls } = createMockDb(null)

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
    expect(calls[0]?.sql).toContain('SELECT id, collection_id FROM content')
  })
})

describe('content domain update', () => {
  it('updates admin content, creates a version for data changes, and invalidates cache', async () => {
    const calls: Array<{ sql: string; args: any[] }> = []
    const existing = {
      id: 'content-1',
      collection_id: 'collection-1',
      title: 'Old title',
      slug: 'old-title',
      status: 'draft',
      data: JSON.stringify({ title: 'Old title', body: 'Old body' }),
    }
    const db = {
      prepare: vi.fn((sql: string) => ({
        bind: (...args: any[]) => {
          calls.push({ sql, args })
          return {
            first: async () => {
              if (sql.includes('SELECT MAX(version)')) return { max_version: 2 }
              return existing
            },
            run: async () => ({ success: true }),
          }
        },
      })),
    }

    const result = await updateContent({
      db: db as any,
      id: 'content-1',
      mode: 'admin-update',
      patch: {
        title: 'New title',
        slug: 'New Title!',
        status: 'published',
        data: { body: 'New body' },
      },
      authorId: 'user-1',
      now: 456,
    })

    expect(result).toEqual({
      found: true,
      id: 'content-1',
      mode: 'admin-update',
      collectionId: 'collection-1',
      versionCreated: true,
    })
    expect(calls.some((call) => call.sql.includes('UPDATE content SET title = ?'))).toBe(true)
    expect(calls.some((call) => call.args.includes('new-title'))).toBe(true)
    expect(calls.some((call) => call.sql.includes('SELECT MAX(version) as max_version'))).toBe(true)
    expect(calls.some((call) => call.sql.includes('INSERT INTO content_versions'))).toBe(true)
    expect(calls.some((call) => call.args.includes(3))).toBe(true)
  })

  it('updates admin content without a version when only metadata changes', async () => {
    const calls: Array<{ sql: string; args: any[] }> = []
    const existing = {
      id: 'content-1',
      collection_id: 'collection-1',
      title: 'Old title',
      slug: 'old-title',
      status: 'draft',
      data: JSON.stringify({ title: 'Old title', body: 'Old body' }),
    }
    const db = {
      prepare: vi.fn((sql: string) => ({
        bind: (...args: any[]) => {
          calls.push({ sql, args })
          return {
            first: async () => existing,
            run: async () => ({ success: true }),
          }
        },
      })),
    }

    const result = await updateContent({
      db: db as any,
      id: 'content-1',
      mode: 'admin-update',
      patch: { status: 'published' },
      authorId: 'user-1',
    })

    expect(result.found).toBe(true)
    expect(result.versionCreated).toBe(false)
    expect(calls.some((call) => call.sql.includes('INSERT INTO content_versions'))).toBe(false)
  })

  it('updates headless content by replacing data without creating versions', async () => {
    const calls: Array<{ sql: string; args: any[] }> = []
    const existing = {
      id: 'content-1',
      collection_id: 'collection-1',
      title: 'Old title',
      slug: 'old-title',
      status: 'draft',
      data: JSON.stringify({ body: 'Old body', keep: false }),
    }
    const db = {
      prepare: vi.fn((sql: string) => ({
        bind: (...args: any[]) => {
          calls.push({ sql, args })
          return {
            first: async () => existing,
            run: async () => ({ success: true }),
          }
        },
      })),
    }

    const result = await updateContent({
      db: db as any,
      id: 'content-1',
      mode: 'headless-update',
      patch: {
        title: 'New title',
        slug: ' New Title! ',
        status: 'published',
        data: { body: 'New body' },
      },
      authorId: 'user-1',
      now: 789,
    })

    expect(result).toEqual({
      found: true,
      id: 'content-1',
      mode: 'headless-update',
      collectionId: 'collection-1',
      versionCreated: false,
    })
    expect(calls.some((call) => call.args.includes('-new-title-'))).toBe(true)
    expect(calls.some((call) => call.args.includes(JSON.stringify({ body: 'New body' })))).toBe(true)
    expect(calls.some((call) => call.sql.includes('INSERT INTO content_versions'))).toBe(false)
  })

  it('returns not found without mutating admin content', async () => {
    const calls: Array<{ sql: string; args: any[] }> = []
    const db = {
      prepare: vi.fn((sql: string) => ({
        bind: (...args: any[]) => {
          calls.push({ sql, args })
          return {
            first: async () => null,
            run: async () => ({ success: true }),
          }
        },
      })),
    }

    const result = await updateContent({
      db: db as any,
      id: 'missing',
      mode: 'admin-update',
      patch: { status: 'published' },
      authorId: 'user-1',
    })

    expect(result).toEqual({
      found: false,
      id: 'missing',
      mode: 'admin-update',
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.sql).toContain('SELECT * FROM content')
  })
})
