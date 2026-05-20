import { describe, expect, it } from 'vitest'
import { collectionCacheKeys, contentCacheKeys } from './cache-keys'

describe('cache key registry', () => {
  it('defines content cache keys and invalidation patterns', () => {
    expect(contentCacheKeys.item('content-1')).toBe('api:content:content-1')
    expect(contentCacheKeys.listByCollectionPattern('collection-1')).toBe('content:list:collection-1:*')
    expect(contentCacheKeys.filteredPattern()).toBe('content-filtered:*')
  })

  it('defines collection cache keys', () => {
    expect(collectionCacheKeys.all()).toBe('cache:collections:all')
    expect(collectionCacheKeys.byName('posts')).toBe('cache:collection:posts')
  })
})
