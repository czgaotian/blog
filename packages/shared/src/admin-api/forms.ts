import { z } from 'zod'

export interface FormListItem {
  id: string
  name: string
  displayName: string
  description: string | null
  category: string
  isActive: boolean
  isPublic: boolean
  submissionCount: number
  createdAt: string
  updatedAt: string
}

export interface FormsListResponse {
  forms: FormListItem[]
  total: number
}

export interface FormSettings {
  emailNotifications: boolean
  notifyEmail: string | null
  successMessage: string
  redirectUrl: string | null
  allowAnonymous: boolean
  requireAuth: boolean
  maxSubmissions: number | null
  submitButtonText: string
}

export interface FormDetailResponse {
  id: string
  name: string
  displayName: string
  description: string | null
  category: string
  formioSchema: unknown
  settings: FormSettings
  isActive: boolean
  isPublic: boolean
  submissionCount: number
  createdAt: string
  updatedAt: string
}

export const createFormSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/, 'Must be lowercase letters, numbers, hyphens, or underscores'),
  displayName: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional().default('general'),
  isPublic: z.boolean().optional().default(true),
  formioSchema: z.unknown().optional(),
})

export const updateFormSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  formioSchema: z.unknown().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
})

export type CreateFormRequest = z.infer<typeof createFormSchema>
export type UpdateFormRequest = z.infer<typeof updateFormSchema>

export interface MutateFormResponse {
  message: string
  id?: string
}
