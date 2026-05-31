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

const requiredString = (message: string) =>
  z.string({ error: message }).trim().min(1, message)

export const registerSchema = z.object({
  email: requiredString('Email is required')
    .pipe(z.string().email('Enter a valid email address').toLowerCase()),
  username: requiredString('Username is required')
    .pipe(
      z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(100, 'Username must be 100 characters or less')
        .regex(/^[A-Za-z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
    ),
  firstName: requiredString('First name is required')
    .pipe(z.string().max(100, 'First name must be 100 characters or less')),
  lastName: requiredString('Last name is required')
    .pipe(z.string().max(100, 'Last name must be 100 characters or less')),
  password: requiredString('Password is required')
    .pipe(
      z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must be 128 characters or less'),
    ),
})
export type RegisterRequest = z.infer<typeof registerSchema>

export interface RegisterResponse {
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
