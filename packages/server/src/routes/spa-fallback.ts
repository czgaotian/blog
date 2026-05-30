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
  return accept === '' || accept.includes('text/html')
}

function isRootRedirect(response: Response): boolean {
  if (response.status < 300 || response.status >= 400) {
    return false
  }

  const location = response.headers.get('Location')
  if (!location) {
    return false
  }

  return new URL(location, 'http://localhost').pathname === '/'
}

async function fetchSpaShell(c: any): Promise<Response> {
  const response = await c.env.ASSETS.fetch(toAssetRequest(c, '/index.html'))

  if (isRootRedirect(response)) {
    return c.env.ASSETS.fetch(toAssetRequest(c, '/'))
  }

  return response
}

export function createSpaFallbackRoutes() {
  const routes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

  routes.get('/api/*', (c) => c.notFound())

  routes.get('*', async (c) => {
    if (!acceptsHtml(c)) {
      return c.notFound()
    }

    const response = await fetchSpaShell(c)
    return withCacheHeader(response, 'no-store')
  })

  return routes
}

export async function serveSpaShell(c: any): Promise<Response> {
  const response = await fetchSpaShell(c)
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'no-store')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}
