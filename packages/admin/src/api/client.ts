import { SETUP_REQUIRED_CODE } from '@worker-blog/shared/admin-api'

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AdminApiError'
  }
}

function getCookie(name: string): string | null {
  const match = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${encodeURIComponent(name)}=`))

  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null
}

function isMutatingMethod(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())
}

export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method || 'GET'
  const headers = new Headers(init.headers)

  if (!(init.body instanceof FormData) && init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const csrfToken = getCookie('csrf_token')
  if (csrfToken && isMutatingMethod(method)) {
    headers.set('X-CSRF-Token', csrfToken)
  }

  const response = await fetch(path, {
    ...init,
    method,
    headers,
    credentials: 'same-origin',
  })

  const contentType = response.headers.get('Content-Type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    if (
      response.status === 428 &&
      typeof payload === 'object' &&
      payload &&
      'code' in payload &&
      (payload as { code: unknown }).code === SETUP_REQUIRED_CODE &&
      window.location.pathname !== '/auth/register'
    ) {
      window.location.href = '/auth/register?setup=true'
    }

    const message = typeof payload === 'object' && payload && 'error' in payload
      ? String((payload as { error: unknown }).error)
      : response.statusText
    throw new AdminApiError(message, response.status, payload)
  }

  return payload as T
}
