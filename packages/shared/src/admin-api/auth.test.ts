import { describe, expect, it } from 'vitest'
import { loginSchema, registerSchema } from './auth'

describe('loginSchema', () => {
  it('accepts a valid login payload and normalizes email', () => {
    const result = loginSchema.safeParse({
      email: ' ADMIN@Example.com ',
      password: 'password123',
    })

    expect(result.success).toBe(true)
    if (!result.success) {
      return
    }

    expect(result.data).toEqual({
      email: 'admin@example.com',
      password: 'password123',
    })
  })

  it('returns field-specific messages for invalid login payloads', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: '',
    })

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }

    expect(result.error.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: 'Enter a valid email address', path: ['email'] }),
      expect.objectContaining({ message: 'Password is required', path: ['password'] }),
    ]))
  })
})

describe('registerSchema', () => {
  it('accepts a valid registration payload and normalizes string values', () => {
    const result = registerSchema.safeParse({
      email: ' ADMIN@Example.com ',
      username: ' admin_user ',
      firstName: ' Admin ',
      lastName: ' User ',
      password: 'password123',
    })

    expect(result.success).toBe(true)
    if (!result.success) {
      return
    }

    expect(result.data).toEqual({
      email: 'admin@example.com',
      username: 'admin_user',
      firstName: 'Admin',
      lastName: 'User',
      password: 'password123',
    })
  })

  it('returns field-specific messages for invalid registration payloads', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      username: 'a!',
      firstName: '',
      lastName: '',
      password: 'short',
    })

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }

    expect(result.error.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: 'Enter a valid email address', path: ['email'] }),
      expect.objectContaining({ message: 'Username must be at least 3 characters', path: ['username'] }),
      expect.objectContaining({ message: 'First name is required', path: ['firstName'] }),
      expect.objectContaining({ message: 'Last name is required', path: ['lastName'] }),
      expect.objectContaining({ message: 'Password must be at least 8 characters', path: ['password'] }),
    ]))
  })

  it('requires every database-backed registration field', () => {
    const result = registerSchema.safeParse({})

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }

    expect(result.error.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: 'Email is required', path: ['email'] }),
      expect.objectContaining({ message: 'Username is required', path: ['username'] }),
      expect.objectContaining({ message: 'First name is required', path: ['firstName'] }),
      expect.objectContaining({ message: 'Last name is required', path: ['lastName'] }),
      expect.objectContaining({ message: 'Password is required', path: ['password'] }),
    ]))
  })
})
