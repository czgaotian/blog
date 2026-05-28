import { useMutation } from '@tanstack/react-query'
import type {
  LoginRequest, LoginResponse,
  RegisterRequest, RegisterResponse,
} from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export function useLogin() {
  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: (data) =>
      adminFetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  })
}

export function useRegister() {
  return useMutation<RegisterResponse, Error, RegisterRequest>({
    mutationFn: (data) =>
      adminFetch<RegisterResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  })
}
