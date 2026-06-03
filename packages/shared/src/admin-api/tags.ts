import { z } from 'zod'

export interface TagListItem {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface TagListResponse {
  items: TagListItem[]
  total: number
}

export type TagDetailResponse = TagListItem

export const createTagSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
})

export const updateTagSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
})

export type CreateTagRequest = z.infer<typeof createTagSchema>
export type UpdateTagRequest = z.infer<typeof updateTagSchema>

export interface MutateTagResponse {
  message: string
  id?: string
}
