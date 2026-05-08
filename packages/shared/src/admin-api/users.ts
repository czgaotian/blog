import { z } from 'zod'

export interface AdminUserListItem {
  id: string
  email: string
  username: string | null
  firstName: string | null
  lastName: string | null
  role: string
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
}

export interface UsersListResponse {
  users: AdminUserListItem[]
  total: number
  page: number
  limit: number
}

export interface AdminUserDetail extends AdminUserListItem {
  phone: string | null
  bio: string | null
  avatarUrl: string | null
  timezone: string
  language: string
  twoFactorEnabled: boolean
}

export interface UserDetailResponse {
  user: AdminUserDetail
}

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'editor', 'author', 'viewer']),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
})

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(['admin', 'editor', 'author', 'viewer']).optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
})

export type CreateUserRequest = z.infer<typeof createUserSchema>
export type UpdateUserRequest = z.infer<typeof updateUserSchema>

export interface MutateUserResponse {
  message: string
  userId?: string
}

// Profile

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

// Activity Logs

export interface ActivityLogItem {
  id: string
  userId: string | null
  action: string
  resourceType: string | null
  resourceId: string | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  userEmail: string | null
  userName: string | null
}

export interface ActivityLogsListResponse {
  logs: ActivityLogItem[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}
