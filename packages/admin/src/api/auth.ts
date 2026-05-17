import { useMutation } from '@tanstack/react-query'
import type {
  LoginRequest, LoginResponse,
  RegisterRequest, RegisterResponse,
  AcceptInvitationRequest,
  RequestPasswordResetRequest,
  ResetPasswordRequest,
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

export function useAcceptInvitation() {
  return useMutation<{ message: string }, Error, AcceptInvitationRequest>({
    mutationFn: (data) =>
      adminFetch('/api/auth/accept-invitation', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  })
}

export function useRequestPasswordReset() {
  return useMutation<{ message: string }, Error, RequestPasswordResetRequest>({
    mutationFn: (data) =>
      adminFetch('/api/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  })
}

export function useResetPassword() {
  return useMutation<{ message: string }, Error, ResetPasswordRequest>({
    mutationFn: (data) =>
      adminFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  })
}
