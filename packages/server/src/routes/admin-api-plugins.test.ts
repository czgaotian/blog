import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../middleware', () => ({
  requireAuth: () => async (_c: any, next: any) => { await next() },
  requireRole: () => async (_c: any, next: any) => { await next() },
}))

vi.mock('../plugins/manifest-registry', () => ({
  PLUGIN_REGISTRY: {
    'rss-feed': {
      id: 'rss-feed', codeName: 'rss-feed', displayName: 'RSS Feed',
      description: 'RSS support', version: '1.0.0', author: 'core',
      category: 'content', iconEmoji: '📡', permissions: [], dependencies: [],
      is_core: false, defaultSettings: {},
    },
  },
}))

vi.mock('../services', () => ({
  PluginService: class {
    async getAllPlugins() { return [] }
    async getPluginStats() { return { total: 0, active: 0, inactive: 0, errors: 0, uninstalled: 0 } }
  },
}))

import { adminApiPluginsRoutes } from './admin-api-plugins'

function createApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', { userId: 'u1', email: 'a@example.com', role: 'admin', exp: 0, iat: 0 })
    await next()
  })
  app.route('/admin/api/plugins', adminApiPluginsRoutes)
  return app
}

describe('GET /admin/api/plugins', () => {
  it('returns plugins list with uninstalled registry plugins and stats', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/plugins', {}, { DB: {} })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('plugins')
    expect(json).toHaveProperty('stats')
    // rss-feed is in registry but not installed → shows as uninstalled
    expect(json.plugins).toHaveLength(1)
    expect(json.plugins[0].id).toBe('rss-feed')
    expect(json.plugins[0].status).toBe('uninstalled')
    expect(json.plugins[0].displayName).toBe('RSS Feed')
    expect(json.stats.uninstalled).toBe(1)
    expect(json.stats.total).toBe(1)
    // stats.error (singular) not errors
    expect(json.stats).toHaveProperty('error')
  })

  it('returns 401 when unauthenticated', async () => {
    const app = new Hono()
    app.route('/admin/api/plugins', adminApiPluginsRoutes)
    const res = await app.request('/admin/api/plugins', {}, { DB: {} })
    expect(res.status).toBe(401)
  })
})
