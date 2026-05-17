import { describe, expect, it, vi } from 'vitest'
import { deleteCollection, invalidateCollectionCache } from './collection-domain'

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

function createMockDb(options: { collection?: any; contentCount?: number } = {}) {
  const collection = Object.prototype.hasOwnProperty.call(options, 'collection')
    ? options.collection
    : { name: 'posts', managed: 0 }
  const contentCount = options.contentCount ?? 0
  const runCalls: string[] = []
  const db = {
    prepare: vi.fn((sql: string) => ({
      bind: (..._args: any[]) => ({
        first: async () => {
          if (sql.includes('SELECT name, managed FROM collections')) return collection
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
  it('deletes collection fields and collection when empty', async () => {
    const { db, runCalls } = createMockDb()
    const cacheKv = { delete: vi.fn().mockResolvedValue(undefined) }

    const result = await deleteCollection({
      db: db as any,
      id: 'col1',
      cacheKv: cacheKv as any,
    })

    expect(result).toEqual({ deleted: true, id: 'col1', name: 'posts' })
    expect(runCalls.some((sql) => sql.includes('DELETE FROM content_fields'))).toBe(true)
    expect(runCalls.some((sql) => sql.includes('DELETE FROM collections'))).toBe(true)
    expect(cacheKv.delete).toHaveBeenCalledWith('cache:collections:all')
    expect(cacheKv.delete).toHaveBeenCalledWith('cache:collection:posts')
  })

  it('blocks managed collections by default', async () => {
    const { db, runCalls } = createMockDb({ collection: { name: 'posts', managed: 1 } })

    const result = await deleteCollection({
      db: db as any,
      id: 'col1',
    })

    expect(result).toEqual({ deleted: false, reason: 'managed', name: 'posts' })
    expect(runCalls).toHaveLength(0)
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
