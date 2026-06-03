import { describe, expect, it } from 'vitest'
import { contentsCacheKeys } from './cache-keys'

describe('cache key registry', () => {
  it('defines contents cache keys and invalidation patterns', () => {
    expect(contentsCacheKeys.item('content-1')).toBe('api:contents:content-1')
    expect(contentsCacheKeys.filteredPattern()).toBe('contents-filtered:*')
  })
})
