export interface CacheConfig {
  ttl: number
  keyPrefix: string
}

interface CacheEntry {
  value: unknown
  expiresAt: number
}

export class CacheService {
  private config: CacheConfig
  private memory = new Map<string, CacheEntry>()
  private kvNamespace?: KVNamespace

  constructor(config: CacheConfig, kvNamespace?: KVNamespace) {
    this.config = config
    this.kvNamespace = kvNamespace
  }

  generateKey(type: string, identifier?: string): string {
    const parts = [this.config.keyPrefix, type]
    if (identifier) {
      parts.push(identifier)
    }
    return parts.join(':')
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.memory.get(key)
    if (entry) {
      if (entry.expiresAt > Date.now()) {
        return entry.value as T
      }
      this.memory.delete(key)
    }

    if (!this.kvNamespace) {
      return null
    }

    const value = await this.kvNamespace.get<T>(key, 'json')
    return value ?? null
  }

  async getWithSource<T>(key: string): Promise<{
    hit: boolean
    data: T | null
    source: string
    ttl?: number
  }> {
    const entry = this.memory.get(key)
    if (entry) {
      if (entry.expiresAt > Date.now()) {
        return {
          hit: true,
          data: entry.value as T,
          source: 'memory',
          ttl: Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000)),
        }
      }
      this.memory.delete(key)
    }

    if (this.kvNamespace) {
      const value = await this.kvNamespace.get<T>(key, 'json')
      if (value !== null) {
        return {
          hit: true,
          data: value,
          source: 'kv',
        }
      }
    }

    return {
      hit: false,
      data: null,
      source: 'none',
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const ttlSeconds = ttl ?? this.config.ttl
    this.memory.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })

    if (this.kvNamespace) {
      await this.kvNamespace.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds })
    }
  }

  async delete(key: string): Promise<void> {
    this.memory.delete(key)
    if (this.kvNamespace) {
      await this.kvNamespace.delete(key)
    }
  }

  async invalidate(pattern: string): Promise<void> {
    const regex = wildcardToRegex(pattern)
    for (const key of this.memory.keys()) {
      if (regex.test(key)) {
        this.memory.delete(key)
      }
    }
  }

  async clear(): Promise<void> {
    this.memory.clear()
  }

  async getOrSet<T>(key: string, callback: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = await callback()
    await this.set(key, value, ttl)
    return value
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

  const service = new CacheService(config, kvNamespace)
  coreCacheInstances.set(key, service)
  return service
}

function wildcardToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  const wildcarded = escaped.replace(/\*/g, '.*').replace(/\?/g, '.')
  return new RegExp(`^${wildcarded}$`)
}
