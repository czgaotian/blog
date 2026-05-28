import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { createAdminSpaRoutes } from './admin-spa'

function createApp(assetResponse: Response) {
  const assetsFetch = vi.fn().mockResolvedValue(assetResponse)
  const app = new Hono()

  app.use('*', async (c, next) => {
    c.env = {
      ASSETS: {
        fetch: assetsFetch,
      },
    }
    await next()
  })

  app.route('/', createAdminSpaRoutes())

  return { app, assetsFetch }
}

describe('admin SPA routes', () => {
  it('rewrites /admin/assets requests to the Vite assets directory', async () => {
    const { app, assetsFetch } = createApp(new Response('body', { status: 200 }))

    const res = await app.request('/admin/assets/app.js')

    expect(res.status).toBe(200)
    expect(assetsFetch).toHaveBeenCalledTimes(1)
    const request = assetsFetch.mock.calls[0][0] as Request
    expect(new URL(request.url).pathname).toBe('/assets/app.js')
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
  })

  it('serves index.html for navigation requests under /admin', async () => {
    const { app, assetsFetch } = createApp(new Response('<div id="admin-root"></div>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }))

    const res = await app.request('/admin/spa-test', {
      headers: { Accept: 'text/html' },
    })
    const html = await res.text()

    expect(res.status).toBe(200)
    expect(html).toContain('admin-root')
    const request = assetsFetch.mock.calls[0][0] as Request
    expect(new URL(request.url).pathname).toBe('/index.html')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('does not serve SPA fallback for admin API paths', async () => {
    const { app, assetsFetch } = createApp(new Response('index', { status: 200 }))

    const res = await app.request('/api/admin/logs', {
      headers: { Accept: 'text/html' },
    })

    expect(res.status).toBe(404)
    expect(assetsFetch).not.toHaveBeenCalled()
  })
})
