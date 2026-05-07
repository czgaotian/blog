import { z } from 'zod'

export interface AuthSettings {
  enablePasswordLogin?: boolean
  enableOAuthLogin?: boolean
  requireEmailVerification?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export const baseRegistrationSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional()
})

export type RegistrationSchema = typeof baseRegistrationSchema
export type RegistrationData = z.infer<RegistrationSchema>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateRegistrationDefaultValue(field: string, data: any): string {
  switch (field) {
    case 'username':
      return data.email ? data.email.split('@')[0] : `user${Date.now()}`
    case 'firstName':
      return 'User'
    case 'lastName':
      return data.email ? data.email.split('@')[0] : 'Account'
    default:
      return ''
  }
}
