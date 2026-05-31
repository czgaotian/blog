import { adminFetch } from './client'

interface SessionResponse {
  user: {
    id: string
    email: string
    role: string
  }
}

interface AdminSessionResponse {
  user: {
    id: string
    email: string
    role: string
  }
  permissions: string[]
  app: {
    name: string
    version: string
  }
}

export const adminApi = {
  session: async (): Promise<AdminSessionResponse> => {
    const res = await adminFetch<SessionResponse>('/api/auth/session')
    return {
      user: {
        id: res.user.id,
        email: res.user.email,
        role: res.user.role,
      },
      permissions: [res.user.role],
      app: {
        name: 'Worker Blog',
        version: '0.0.0',
      },
    }
  },
}
