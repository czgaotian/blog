import { z } from 'zod'

export type ContentStatus = 'draft' | 'review' | 'scheduled' | 'published' | 'archived' | 'deleted'

export interface ContentListItem {
  id: string
  title: string
  slug: string
  status: ContentStatus
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

export interface ContentDetailResponse {
  id: string
  title: string
  slug: string
  status: ContentStatus
  publishedAt: string | null
  authorId: string
  authorName: string
  createdAt: string
  updatedAt: string
}

export interface ContentVersion {
  id: string
  version: number
  data: ContentVersionSnapshot
  authorName: string
  createdAt: string
  isCurrent: boolean
}

export interface ContentVersionsResponse {
  versions: ContentVersion[]
}

export interface ContentVersionSnapshot {
  id: string
  title: string
  slug: string
  status: ContentStatus
  publishedAt: string | null
  authorId: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export const createContentSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().max(500).optional(),
  status: z.enum(['draft', 'review', 'scheduled', 'published', 'archived']).optional().default('draft'),
  publishedAt: z.string().nullable().optional(),
})

export const updateContentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  slug: z.string().max(500).optional(),
  status: z.enum(['draft', 'review', 'scheduled', 'published', 'archived', 'deleted']).optional(),
  publishedAt: z.string().nullable().optional(),
})

export type CreateContentRequest = z.infer<typeof createContentSchema>
export type UpdateContentRequest = z.infer<typeof updateContentSchema>

export interface MutateContentResponse {
  message: string
  id?: string
}
