import { adminFetch } from './client'

interface AuthMeResponse {
  user: {
    id: string
    email: string
    role: string
  }
}

interface AdminMeResponse {
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
  me: async (): Promise<AdminMeResponse> => {
    const res = await adminFetch<AuthMeResponse>('/api/auth/me')
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
