import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { createSpaFallbackRoutes } from './spa-fallback'

function createApp(assetResponse: Response | Response[]) {
  const responses = Array.isArray(assetResponse) ? assetResponse : [assetResponse]
  const assetsFetch = vi.fn()

  for (const response of responses) {
    assetsFetch.mockResolvedValueOnce(response)
  }

  assetsFetch.mockResolvedValue(responses[responses.length - 1])
  const app = new Hono()

  app.use('*', async (c, next) => {
    c.env = {
      ASSETS: {
        fetch: assetsFetch,
      },
    }
    await next()
  })

  app.route('/', createSpaFallbackRoutes())

  return { app, assetsFetch }
}

describe('SPA routes', () => {
  it('serves index.html for non-API navigation requests', async () => {
    const { app, assetsFetch } = createApp(new Response('<div id="admin-root"></div>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }))

    const res = await app.request('/dashboard', {
      headers: { Accept: 'text/html' },
    })
    const html = await res.text()

    expect(res.status).toBe(200)
    expect(html).toContain('admin-root')
    const request = assetsFetch.mock.calls[0][0] as Request
    expect(new URL(request.url).pathname).toBe('/index.html')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('falls back to / when Vite dev redirects /index.html to the root base', async () => {
    const { app, assetsFetch } = createApp([
      new Response(null, { status: 307, headers: { Location: '/' } }),
      new Response('<div id="admin-root"></div>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    ])

    const res = await app.request('/dashboard', {
      headers: { Accept: 'text/html' },
    })
    const html = await res.text()

    expect(res.status).toBe(200)
    expect(html).toContain('admin-root')
    expect(assetsFetch).toHaveBeenCalledTimes(2)
    const firstRequest = assetsFetch.mock.calls[0][0] as Request
    const secondRequest = assetsFetch.mock.calls[1][0] as Request
    expect(new URL(firstRequest.url).pathname).toBe('/index.html')
    expect(new URL(secondRequest.url).pathname).toBe('/')
  })

  it('does not serve SPA fallback for API paths', async () => {
    const { app, assetsFetch } = createApp(new Response('index', { status: 200 }))

    const res = await app.request('/api/admin/logs', {
      headers: { Accept: 'text/html' },
    })

    expect(res.status).toBe(404)
    expect(assetsFetch).not.toHaveBeenCalled()
  })

  it('does not treat wildcard accept headers as SPA navigation', async () => {
    const { app, assetsFetch } = createApp(new Response('index', { status: 200 }))

    const res = await app.request('/assets/missing.js', {
      headers: { Accept: '*/*' },
    })

    expect(res.status).toBe(404)
    expect(assetsFetch).not.toHaveBeenCalled()
  })

  it('does not serve SPA fallback for non-navigation requests', async () => {
    const { app, assetsFetch } = createApp(new Response('index', { status: 200 }))

    const res = await app.request('/assets/missing.js', {
      headers: { Accept: 'application/javascript' },
    })

    expect(res.status).toBe(404)
    expect(assetsFetch).not.toHaveBeenCalled()
  })
})
