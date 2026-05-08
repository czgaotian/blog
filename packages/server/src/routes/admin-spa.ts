import { Hono } from 'hono'
import type { Bindings, Variables } from '../app'

function withCacheHeader(response: Response, value: string): Response {
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', value)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function toAssetRequest(c: any, pathname: string): Request {
  const url = new URL(c.req.url)
  url.pathname = pathname
  return new Request(url, c.req.raw)
}

function acceptsHtml(c: any): boolean {
  const accept = c.req.header('Accept') || ''
  return accept === '' || accept.includes('text/html') || accept.includes('*/*')
}

export function createAdminSpaRoutes() {
  const routes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

  routes.get('/admin/assets/*', async (c) => {
    const url = new URL(c.req.url)
    const assetPath = url.pathname.replace(/^\/admin\/assets\//, '/assets/')
    const response = await c.env.ASSETS.fetch(toAssetRequest(c, assetPath))
    return withCacheHeader(response, 'public, max-age=31536000, immutable')
  })

  routes.get('/admin', async (c) => {
    const response = await c.env.ASSETS.fetch(toAssetRequest(c, '/index.html'))
    return withCacheHeader(response, 'no-store')
  })

  routes.get('/admin/*', async (c) => {
    const url = new URL(c.req.url)

    if (url.pathname.startsWith('/admin/api/') || url.pathname.startsWith('/admin/assets/')) {
      return c.notFound()
    }

    if (!acceptsHtml(c)) {
      return c.notFound()
    }

    const response = await c.env.ASSETS.fetch(toAssetRequest(c, '/index.html'))
    return withCacheHeader(response, 'no-store')
  })

  return routes
}

export async function serveAdminSpaShell(c: any): Promise<Response> {
  const url = new URL(c.req.url)
  url.pathname = '/index.html'
  const response = await c.env.ASSETS.fetch(new Request(url, c.req.raw))
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'no-store')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}
