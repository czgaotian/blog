/**
 * Core cache compatibility layer.
 *
 * Core routes historically imported this module directly, while the richer
 * built-in cache feature owns the canonical cache implementation. Keep the
 * small core API stable and delegate storage to the feature cache service so
 * namespace instances, stats, and future KV wiring share one implementation.
 */

import {
  CacheService as FeatureCacheService,
  getCacheService as getFeatureCacheService,
} from '../features/cache/services/cache'
import type { CacheConfig as FeatureCacheConfig } from '../features/cache/services/cache-config'

export interface CacheConfig {
  ttl: number
  keyPrefix: string
}

export class CacheService {
  private config: CacheConfig
  private cache: FeatureCacheService

  constructor(config: CacheConfig, cache?: FeatureCacheService) {
    this.config = config
    this.cache = cache || new FeatureCacheService(toFeatureConfig(config))
  }

  generateKey(type: string, identifier?: string): string {
    const parts = [this.config.keyPrefix, type]
    if (identifier) {
      parts.push(identifier)
    }
    return parts.join(':')
  }

  async get<T>(key: string): Promise<T | null> {
    return this.cache.get<T>(key)
  }

  async getWithSource<T>(key: string): Promise<{
    hit: boolean
    data: T | null
    source: string
    ttl?: number
  }> {
    const result = await this.cache.getWithSource<T>(key)
    const response: {
      hit: boolean
      data: T | null
      source: string
      ttl?: number
    } = {
      hit: result.hit,
      data: result.data,
      source: result.hit ? result.source : 'none',
    }
    if (result.ttl !== undefined) {
      response.ttl = result.ttl
    }
    return response
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.cache.set(key, value, ttl ? { ttl } : undefined)
  }

  async delete(key: string): Promise<void> {
    await this.cache.delete(key)
  }

  async invalidate(pattern: string): Promise<void> {
    await this.cache.invalidate(pattern)
  }

  async clear(): Promise<void> {
    await this.cache.clear()
  }

  async getOrSet<T>(key: string, callback: () => Promise<T>, ttl?: number): Promise<T> {
    return this.cache.getOrSet(key, callback, ttl ? { ttl } : undefined)
  }
}

export const CACHE_CONFIGS = {
  api: {
    ttl: 300,
    keyPrefix: 'api',
  },
  user: {
    ttl: 600,
    keyPrefix: 'user',
  },
  content: {
    ttl: 300,
    keyPrefix: 'content',
  },
  collection: {
    ttl: 600,
    keyPrefix: 'collection',
  },
}

const coreCacheInstances = new Map<string, CacheService>()

export function getCacheService(config: CacheConfig, kvNamespace?: KVNamespace): CacheService {
  const key = config.keyPrefix
  const existing = coreCacheInstances.get(key)
  if (existing) {
    return existing
  }

  const service = new CacheService(
    config,
    getFeatureCacheService(toFeatureConfig(config, !!kvNamespace), kvNamespace),
  )
  coreCacheInstances.set(key, service)
  return service
}

function toFeatureConfig(config: CacheConfig, kvEnabled = false): FeatureCacheConfig {
  return {
    ttl: config.ttl,
    kvEnabled,
    memoryEnabled: true,
    namespace: config.keyPrefix,
    invalidateOn: [],
  }
}
