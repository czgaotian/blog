import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SETUP_REQUIRED_CODE } from '@worker-blog/shared/admin-api'
import { AdminApiError, adminFetch } from './client'

function stubBrowser(pathname: string) {
  const location = { pathname, href: `http://localhost${pathname}` }
  vi.stubGlobal('document', { cookie: '' })
  vi.stubGlobal('window', { location })
  return location
}

describe('adminFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('redirects to first-admin registration when setup is required', async () => {
    const location = stubBrowser('/dashboard')
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      error: 'Initial admin account is required',
      code: SETUP_REQUIRED_CODE,
    }), {
      status: 428,
      headers: { 'Content-Type': 'application/json' },
    }))

    await expect(adminFetch('/api/auth/session')).rejects.toMatchObject({
      name: 'AdminApiError',
      status: 428,
    })
    expect(location.href).toBe('/auth/register?setup=true')
  })

  it('does not redirect again while already on the registration page', async () => {
    const location = stubBrowser('/auth/register')
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      error: 'Initial admin account is required',
      code: SETUP_REQUIRED_CODE,
    }), {
      status: 428,
      headers: { 'Content-Type': 'application/json' },
    }))

    await expect(adminFetch('/api/auth/session')).rejects.toBeInstanceOf(AdminApiError)
    expect(location.href).toBe('http://localhost/auth/register')
  })

  it('preserves normal API error behavior for other failures', async () => {
    const location = stubBrowser('/dashboard')
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      error: 'Invalid email or password',
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }))

    await expect(adminFetch('/api/auth/login')).rejects.toMatchObject({
      message: 'Invalid email or password',
      status: 401,
    })
    expect(location.href).toBe('http://localhost/dashboard')
  })
})
