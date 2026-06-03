import { describe, expect, it } from 'vitest'
import { contentCacheKeys } from './cache-keys'

describe('cache key registry', () => {
  it('defines content cache keys and invalidation patterns', () => {
    expect(contentCacheKeys.item('content-1')).toBe('api:content:content-1')
    expect(contentCacheKeys.filteredPattern()).toBe('content-filtered:*')
  })
})
