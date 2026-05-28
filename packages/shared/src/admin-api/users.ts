import { z } from 'zod'

export interface UserProfileResponse {
  id: string
  email: string
  username: string
  firstName: string
  lastName: string
  phone: string | null
  bio: string | null
  avatarUrl: string | null
  timezone: string
  language: string
  theme: string
  emailNotifications: boolean
  twoFactorEnabled: boolean
  role: string
  createdAt: string
  lastLoginAt: string | null
}

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  username: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
  bio: z.string().max(1000).optional(),
  timezone: z.string().max(100).optional().default('UTC'),
  language: z.string().max(10).optional().default('en'),
  emailNotifications: z.boolean().optional().default(true),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(1),
})

export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>

export interface MutateProfileResponse {
  message: string
}
