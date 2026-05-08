import { z } from 'zod'

export type ContentStatus = 'draft' | 'review' | 'scheduled' | 'published' | 'archived' | 'deleted'

export interface ContentListItem {
  id: string
  title: string
  slug: string
  status: ContentStatus
  collectionName: string
  collectionDisplayName: string
  authorName: string
  createdAt: string
  updatedAt: string
}

export interface ContentListResponse {
  items: ContentListItem[]
  total: number
  page: number
  limit: number
}

export interface ContentField {
  id: string
  fieldName: string
  fieldLabel: string
  fieldType: string
  fieldOptions: unknown
  fieldOrder: number
  isRequired: boolean
  isSearchable: boolean
}

export interface ContentDetailResponse {
  id: string
  title: string
  slug: string
  status: ContentStatus
  data: Record<string, unknown>
  collectionId: string
  collectionName: string
  collectionDisplayName: string
  fields: ContentField[]
  authorId: string
  authorName: string
  createdAt: string
  updatedAt: string
}

export interface ContentVersion {
  id: string
  version: number
  data: Record<string, unknown>
  authorName: string
  createdAt: string
  isCurrent: boolean
}

export interface ContentVersionsResponse {
  versions: ContentVersion[]
}

export const createContentSchema = z.object({
  collectionId: z.string().min(1),
  title: z.string().min(1).max(500),
  slug: z.string().max(500).optional(),
  status: z.enum(['draft', 'review', 'scheduled', 'published', 'archived']).optional().default('draft'),
  data: z.record(z.string(), z.unknown()),
})

export const updateContentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  slug: z.string().max(500).optional(),
  status: z.enum(['draft', 'review', 'scheduled', 'published', 'archived', 'deleted']).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
})

export type CreateContentRequest = z.infer<typeof createContentSchema>
export type UpdateContentRequest = z.infer<typeof updateContentSchema>

export interface MutateContentResponse {
  message: string
  id?: string
}
