import { describe, expect, it, vi } from 'vitest'
import { invalidateCollectionCache } from './collection-domain'

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
