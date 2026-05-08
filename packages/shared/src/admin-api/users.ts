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
