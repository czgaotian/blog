import { z } from 'zod'

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
