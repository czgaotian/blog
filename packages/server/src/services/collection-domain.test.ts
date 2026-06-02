import { describe, expect, it, vi } from 'vitest'
import {
  createCollection,
  deleteCollection,
  deleteCollectionField,
  invalidateCollectionCache,
  updateCollection,
  addCollectionField,
  updateCollectionField,
} from './collection-domain'

describe('collection domain cache invalidation', () => {
  it('clears collection list and specific collection cache keys', async () => {
    const cacheKv = {
      delete: vi.fn().mockResolvedValue(undefined),
    }

    await invalidateCollectionCache(cacheKv as any, 'posts')

    expect(cacheKv.delete).toHaveBeenCalledWith('cache:collections:all')
    expect(cacheKv.delete).toHaveBeenCalledWith('cache:collection:posts')
  })

  it('clears only collection list when collection name is missing', async () => {
    const cacheKv = {
      delete: vi.fn().mockResolvedValue(undefined),
    }

    await invalidateCollectionCache(cacheKv as any)

    expect(cacheKv.delete).toHaveBeenCalledTimes(1)
    expect(cacheKv.delete).toHaveBeenCalledWith('cache:collections:all')
  })

  it('does nothing when CACHE_KV is unavailable', async () => {
    await expect(invalidateCollectionCache(undefined, 'posts')).resolves.toBeUndefined()
  })
})

describe('collection domain creation', () => {
  it('creates an empty-schema collection and invalidates cache', async () => {
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
    const cacheKv = { delete: vi.fn().mockResolvedValue(undefined) }

    const result = await createCollection({
      db: db as any,
      input: {
        name: 'posts',
        displayName: 'Posts',
        description: 'Blog posts',
      },
      cacheKv: cacheKv as any,
      id: 'col1',
      now: 123,
    })

    expect(result).toEqual({ created: true, id: 'col1', name: 'posts', createdAt: 123 })
    expect(calls.some((call) => call.sql.includes('SELECT id FROM collections WHERE name = ?'))).toBe(true)
    expect(calls.some((call) => call.sql.includes('INSERT INTO collections'))).toBe(true)
    expect(calls.some((call) => call.args.includes(JSON.stringify({ type: 'object', properties: {}, required: [] })))).toBe(true)
    expect(cacheKv.delete).toHaveBeenCalledWith('cache:collections:all')
    expect(cacheKv.delete).toHaveBeenCalledWith('cache:collection:posts')
  })

  it('returns duplicate without inserting a collection', async () => {
    const calls: Array<{ sql: string; args: any[] }> = []
    const db = {
      prepare: vi.fn((sql: string) => ({
        bind: (...args: any[]) => {
          calls.push({ sql, args })
          return {
            first: async () => ({ id: 'existing' }),
            run: async () => ({ success: true }),
          }
        },
      })),
    }

    const result = await createCollection({
      db: db as any,
      input: {
        name: 'posts',
        displayName: 'Posts',
      },
    })

    expect(result).toEqual({ created: false, reason: 'duplicate', name: 'posts' })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.sql).toContain('SELECT id FROM collections WHERE name = ?')
  })
})

describe('collection domain update', () => {
  it('updates canonical collection metadata and invalidates cache', async () => {
    const calls: Array<{ sql: string; args: any[] }> = []
    const db = {
      prepare: vi.fn((sql: string) => ({
        bind: (...args: any[]) => {
          calls.push({ sql, args })
          return {
            first: async () => ({ name: 'posts' }),
            run: async () => ({ success: true }),
          }
        },
      })),
    }
    const cacheKv = { delete: vi.fn().mockResolvedValue(undefined) }

    const result = await updateCollection({
      db: db as any,
      id: 'col1',
      input: {
        displayName: 'Posts',
        description: 'Updated',
        isActive: false,
      },
      cacheKv: cacheKv as any,
      now: 456,
    })

    expect(result).toEqual({ updated: true, id: 'col1', name: 'posts' })
    expect(calls.some((call) => call.sql.includes('SELECT name FROM collections WHERE id = ?'))).toBe(true)
    expect(calls.some((call) => call.sql.includes('UPDATE collections SET display_name = ?, description = ?, is_active = ?, updated_at = ? WHERE id = ?'))).toBe(true)
    expect(calls.some((call) => call.args.includes(0))).toBe(true)
    expect(cacheKv.delete).toHaveBeenCalledWith('cache:collections:all')
    expect(cacheKv.delete).toHaveBeenCalledWith('cache:collection:posts')
  })

  it('returns no_fields when no canonical update fields are present', async () => {
    const calls: Array<{ sql: string; args: any[] }> = []
    const db = {
      prepare: vi.fn((sql: string) => ({
        bind: (...args: any[]) => {
          calls.push({ sql, args })
          return {
            first: async () => ({ name: 'posts' }),
            run: async () => ({ success: true }),
          }
        },
      })),
    }

    const result = await updateCollection({
      db: db as any,
      id: 'col1',
      input: {},
    })

    expect(result).toEqual({ updated: false, reason: 'no_fields', name: 'posts' })
    expect(calls).toHaveLength(1)
  })

  it('returns not_found when canonical collection is missing', async () => {
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

    const result = await updateCollection({
      db: db as any,
      id: 'missing',
      input: { displayName: 'Posts' },
    })

    expect(result).toEqual({ updated: false, reason: 'not_found' })
    expect(calls).toHaveLength(1)
  })
})

describe('collection domain field add', () => {
  it('adds a schema-backed field and invalidates cache', async () => {
    const calls: Array<{ sql: string; args: any[] }> = []
    const collection = {
      name: 'posts',
      schema: JSON.stringify({ type: 'object', properties: {}, required: [] }),
    }
    const db = {
      prepare: vi.fn((sql: string) => ({
        bind: (...args: any[]) => {
          calls.push({ sql, args })
          return {
            first: async () => collection,
            run: async () => ({ success: true }),
          }
        },
      })),
    }
    const cacheKv = { delete: vi.fn().mockResolvedValue(undefined) }

    const result = await addCollectionField({
      db: db as any,
      collectionId: 'col1',
      input: {
        fieldName: 'summary',
        fieldLabel: 'Summary',
        fieldType: 'markdown',
        isRequired: true,
        isSearchable: true,
        fieldOptions: { maxLength: 500 },
      },
      cacheKv: cacheKv as any,
      now: 789,
    })

    expect(result).toEqual({
      added: true,
      id: 'schema-summary',
      collectionId: 'col1',
      collectionName: 'posts',
    })
    const updateCall = calls.find((call) => call.sql.includes('UPDATE collections SET schema = ?'))
    expect(updateCall).toBeDefined()
    const schema = JSON.parse(String(updateCall?.args[0]))
    expect(schema.properties.summary).toEqual({
      type: 'string',
      title: 'Summary',
      searchable: true,
      maxLength: 500,
      format: 'markdown',
    })
    expect(schema.required).toContain('summary')
    expect(cacheKv.delete).toHaveBeenCalledWith('cache:collections:all')
    expect(cacheKv.delete).toHaveBeenCalledWith('cache:collection:posts')
  })

  it('returns duplicate_field without updating schema', async () => {
    const calls: Array<{ sql: string; args: any[] }> = []
    const collection = {
      name: 'posts',
      schema: JSON.stringify({ type: 'object', properties: { title: { type: 'string' } }, required: [] }),
    }
    const db = {
      prepare: vi.fn((sql: string) => ({
        bind: (...args: any[]) => {
          calls.push({ sql, args })
          return {
            first: async () => collection,
            run: async () => ({ success: true }),
          }
        },
      })),
    }

    const result = await addCollectionField({
      db: db as any,
      collectionId: 'col1',
      input: {
        fieldName: 'title',
        fieldLabel: 'Title',
        fieldType: 'text',
        isRequired: false,
        isSearchable: false,
        fieldOptions: {},
      },
    })

    expect(result).toEqual({ added: false, reason: 'duplicate_field', fieldName: 'title' })
    expect(calls.some((call) => call.sql.includes('UPDATE collections SET schema = ?'))).toBe(false)
  })

  it('returns collection_not_found when adding a field to a missing collection', async () => {
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

    const result = await addCollectionField({
      db: db as any,
      collectionId: 'missing',
      input: {
        fieldName: 'summary',
        fieldLabel: 'Summary',
        fieldType: 'text',
        isRequired: false,
        isSearchable: false,
        fieldOptions: {},
      },
    })

    expect(result).toEqual({ added: false, reason: 'collection_not_found' })
    expect(calls).toHaveLength(1)
  })
})

describe('collection domain field update', () => {
  it('updates a schema-backed field and invalidates cache', async () => {
    const calls: Array<{ sql: string; args: any[] }> = []
    const collection = {
      name: 'posts',
      schema: JSON.stringify({
        type: 'object',
        properties: { title: { type: 'string', title: 'Title', format: 'markdown', searchable: false } },
        required: ['title'],
      }),
    }
    const db = {
      prepare: vi.fn((sql: string) => ({
        bind: (...args: any[]) => {
          calls.push({ sql, args })
          return {
            first: async () => collection,
            run: async () => ({ success: true }),
          }
        },
      })),
    }
    const cacheKv = { delete: vi.fn().mockResolvedValue(undefined) }

    const result = await updateCollectionField({
      db: db as any,
      collectionId: 'col1',
      fieldId: 'schema-title',
      input: {
        fieldLabel: 'Updated Title',
        fieldType: 'text',
        isRequired: false,
        isSearchable: true,
        fieldOptions: { maxLength: 100 },
      },
      cacheKv: cacheKv as any,
      now: 111,
    })

    expect(result).toEqual({
      updated: true,
      fieldId: 'schema-title',
      collectionId: 'col1',
      collectionName: 'posts',
    })
    const updateCall = calls.find((call) => call.sql.includes('UPDATE collections SET schema = ?'))
    const schema = JSON.parse(String(updateCall?.args[0]))
    expect(schema.properties.title).toEqual({
      type: 'string',
      title: 'Updated Title',
      searchable: true,
      maxLength: 100,
    })
    expect(schema.required).not.toContain('title')
    expect(cacheKv.delete).toHaveBeenCalledWith('cache:collection:posts')
  })

  it('returns field_not_found for a missing schema field', async () => {
    const db = {
      prepare: vi.fn((_sql: string) => ({
        bind: () => ({
          first: async () => ({ name: 'posts', schema: JSON.stringify({ type: 'object', properties: {}, required: [] }) }),
          run: async () => ({ success: true }),
        }),
      })),
    }

    const result = await updateCollectionField({
      db: db as any,
      collectionId: 'col1',
      fieldId: 'schema-missing',
      input: { fieldLabel: 'Missing' },
    })

    expect(result).toEqual({ updated: false, reason: 'field_not_found' })
  })

  it('returns field_not_found for non-schema field ids', async () => {
    const db = {
      prepare: vi.fn((_sql: string) => ({
        bind: () => ({
          first: async () => ({ name: 'posts', schema: JSON.stringify({ type: 'object', properties: {}, required: [] }) }),
          run: async () => ({ success: true }),
        }),
      })),
    }

    const result = await updateCollectionField({
      db: db as any,
      collectionId: 'col1',
      fieldId: 'field1',
      input: { fieldLabel: 'Missing' },
    })

    expect(result).toEqual({ updated: false, reason: 'field_not_found' })
  })
})

describe('collection domain field delete', () => {
  it('deletes a schema-backed field and invalidates cache', async () => {
    const calls: Array<{ sql: string; args: any[] }> = []
    const collection = {
      name: 'posts',
      schema: JSON.stringify({
        type: 'object',
        properties: { title: { type: 'string', title: 'Title' } },
        required: ['title'],
      }),
    }
    const db = {
      prepare: vi.fn((sql: string) => ({
        bind: (...args: any[]) => {
          calls.push({ sql, args })
          return {
            first: async () => collection,
            run: async () => ({ success: true }),
          }
        },
      })),
    }
    const cacheKv = { delete: vi.fn().mockResolvedValue(undefined) }

    const result = await deleteCollectionField({
      db: db as any,
      collectionId: 'col1',
      fieldId: 'schema-title',
      cacheKv: cacheKv as any,
      now: 333,
    })

    expect(result).toEqual({
      deleted: true,
      fieldId: 'schema-title',
      collectionId: 'col1',
      collectionName: 'posts',
    })
    const updateCall = calls.find((call) => call.sql.includes('UPDATE collections SET schema = ?'))
    const schema = JSON.parse(String(updateCall?.args[0]))
    expect(schema.properties.title).toBeUndefined()
    expect(schema.required).not.toContain('title')
    expect(cacheKv.delete).toHaveBeenCalledWith('cache:collection:posts')
  })

  it('returns field_not_found for non-schema field ids', async () => {
    const result = await deleteCollectionField({
      db: {} as any,
      collectionId: 'col1',
      fieldId: 'field1',
    })

    expect(result).toEqual({ deleted: false, reason: 'field_not_found' })
  })
})

function createMockDb(options: { collection?: any; contentCount?: number } = {}) {
  const collection = Object.prototype.hasOwnProperty.call(options, 'collection')
    ? options.collection
    : { name: 'posts' }
  const contentCount = options.contentCount ?? 0
  const runCalls: string[] = []
  const db = {
    prepare: vi.fn((sql: string) => ({
      bind: (..._args: any[]) => ({
        first: async () => {
          if (sql.includes('SELECT name FROM collections')) return collection
          if (sql.includes('SELECT COUNT(*) as count FROM content')) return { count: contentCount }
          return null
        },
        run: async () => {
          runCalls.push(sql)
          return { success: true }
        },
      }),
    })),
  }

  return { db, runCalls }
}

describe('collection domain deletion', () => {
  it('deletes collection when empty', async () => {
    const { db, runCalls } = createMockDb()
    const cacheKv = { delete: vi.fn().mockResolvedValue(undefined) }

    const result = await deleteCollection({
      db: db as any,
      id: 'col1',
      cacheKv: cacheKv as any,
    })

    expect(result).toEqual({ deleted: true, id: 'col1', name: 'posts' })
    expect(runCalls.some((sql) => sql.includes('DELETE FROM collections'))).toBe(true)
    expect(cacheKv.delete).toHaveBeenCalledWith('cache:collections:all')
    expect(cacheKv.delete).toHaveBeenCalledWith('cache:collection:posts')
  })

  it('blocks collections that still contain content', async () => {
    const { db, runCalls } = createMockDb({ contentCount: 2 })

    const result = await deleteCollection({
      db: db as any,
      id: 'col1',
    })

    expect(result).toEqual({ deleted: false, reason: 'has_content', name: 'posts', count: 2 })
    expect(runCalls).toHaveLength(0)
  })

  it('returns not found when collection is missing', async () => {
    const { db, runCalls } = createMockDb({ collection: null })

    const result = await deleteCollection({
      db: db as any,
      id: 'missing',
    })

    expect(result).toEqual({ deleted: false, reason: 'not_found' })
    expect(runCalls).toHaveLength(0)
  })
})
