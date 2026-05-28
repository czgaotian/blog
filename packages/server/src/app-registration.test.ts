import { describe, expect, it, vi } from 'vitest'
import { createWorkerBlogApp } from './app'

function createTestEnv(overrides: Record<string, unknown> = {}) {
  return {
    DB: {},
    CACHE_KV: {},
    MEDIA_BUCKET: {
      get: vi.fn().mockResolvedValue(null),
    },
    ASSETS: {
      fetch: vi.fn().mockResolvedValue(new Response('<div id="admin-root"></div>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })),
    },
    ...overrides,
  }
}

describe('createWorkerBlogApp route smoke tests', () => {
  it('mounts public API discovery and health routes', async () => {
    const app = createWorkerBlogApp({ name: 'Smoke App', version: '1.2.3' })
    const env = createTestEnv()

    const apiRes = await app.request('/api', {}, env)
    const healthRes = await app.request('/api/health', {}, env)
    const healthJson = await healthRes.json() as { status: string }

    expect(apiRes.status).toBe(200)
    expect(healthRes.status).toBe(200)
    expect(healthJson).toMatchObject({
      status: 'healthy',
    })
  })

  it('mounts admin API routes behind the admin auth guard', async () => {
    const app = createWorkerBlogApp()

    const res = await app.request('/api/admin/collections', {}, createTestEnv())
    const json = await res.json() as { error: string }

    expect(res.status).toBe(401)
    expect(json.error).toBe('Authentication required')
  })

  it('mounts admin SPA, favicon, and R2 file surfaces', async () => {
    const app = createWorkerBlogApp()
    const env = createTestEnv()

    const adminRes = await app.request('/admin/smoke', {
      headers: { Accept: 'text/html' },
    }, env)
    const faviconRes = await app.request('/favicon.svg', {}, env)
    const fileRes = await app.request('/files/missing.png', {}, env)

    expect(adminRes.status).toBe(200)
    expect(await adminRes.text()).toContain('admin-root')
    expect(faviconRes.status).toBe(200)
    expect(faviconRes.headers.get('Content-Type')).toContain('image/svg+xml')
    expect(fileRes.status).toBe(404)
  })
})
