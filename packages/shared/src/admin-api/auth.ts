import { z } from 'zod'

export const adminMeResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    role: z.string(),
  }),
  permissions: z.array(z.string()),
  app: z.object({
    name: z.string(),
    version: z.string(),
  }),
})

export type AdminMeResponse = z.infer<typeof adminMeResponseSchema>

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
export type LoginRequest = z.infer<typeof loginSchema>

export interface LoginResponse {
  user: {
    id: string
    email: string
    username: string
    firstName: string
    lastName: string
    role: string
  }
  token: string
}

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
})
export type RegisterRequest = z.infer<typeof registerSchema>

export interface RegisterResponse {
  user: {
    id: string
    email: string
    role: string
  }
  token: string
}

export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  username: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
})
export type AcceptInvitationRequest = z.infer<typeof acceptInvitationSchema>

export const requestPasswordResetSchema = z.object({
  email: z.string().email(),
})
export type RequestPasswordResetRequest = z.infer<typeof requestPasswordResetSchema>

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  confirmPassword: z.string().min(1),
})
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>
