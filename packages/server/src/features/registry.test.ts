import { describe, expect, it } from 'vitest'
import {
  builtInFeatureRegistry,
  lateBuiltInFeatureRegistry,
  postCacheBuiltInFeatureRegistry,
  postEventsBuiltInFeatureRegistry,
  preCacheBuiltInFeatureRegistry,
} from './registry'

describe('built-in feature registry', () => {
  it('preserves registration phases and feature order', () => {
    expect(preCacheBuiltInFeatureRegistry.map((feature) => feature.id)).toEqual([
      'security-audit',
      'ai-search',
    ])
    expect(postCacheBuiltInFeatureRegistry.map((feature) => feature.id)).toEqual([
      'oauth-providers',
      'user-profiles',
      'otp-login',
      'analytics',
      'workflow',
    ])
    expect(postEventsBuiltInFeatureRegistry.map((feature) => feature.id)).toEqual([
      'stripe',
    ])
    expect(lateBuiltInFeatureRegistry.map((feature) => feature.id)).toEqual([
      'email',
    ])
    expect(builtInFeatureRegistry.map((feature) => feature.id)).toEqual([
      'security-audit',
      'ai-search',
      'oauth-providers',
      'user-profiles',
      'otp-login',
      'analytics',
      'workflow',
      'stripe',
    ])
  })

  it('marks plugin-era routes as compatibility aliases', () => {
    const routes = builtInFeatureRegistry.flatMap((feature) => feature.routes)

    for (const route of routes) {
      expect(route.compatibilityAlias).toBe(route.path.startsWith('/api/plugins/'))
    }

    expect(routes.filter((route) => route.compatibilityAlias).map((route) => route.path)).toEqual([
      '/api/plugins/security-audit',
      '/api/plugins/ai-search',
      '/api/plugins/analytics',
      '/api/plugins/workflow',
      '/api/plugins/stripe',
    ])
  })

  it('declares required binding metadata for mounted features', () => {
    const bindingMap = Object.fromEntries(
      [...builtInFeatureRegistry, ...lateBuiltInFeatureRegistry].map((feature) => [
        feature.id,
        feature.requiredBindings,
      ]),
    )

    expect(bindingMap['security-audit']).toEqual(['DB', 'CACHE_KV'])
    expect(bindingMap['ai-search']).toEqual(['DB'])
    expect(bindingMap['email']).toEqual(['DB'])
    expect(Object.values(bindingMap).every((bindings) => Array.isArray(bindings) && bindings.length > 0)).toBe(true)
  })
})
