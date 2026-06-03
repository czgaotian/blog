import { z } from 'zod'

export interface CategoryListItem {
  id: string
  name: string
  slug: string
  description: string | null
  parentId: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CategoryListResponse {
  items: CategoryListItem[]
  total: number
}

export type CategoryDetailResponse = CategoryListItem

export const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().optional().default(0),
})

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
})

export type CreateCategoryRequest = z.infer<typeof createCategorySchema>
export type UpdateCategoryRequest = z.infer<typeof updateCategorySchema>

export interface MutateCategoryResponse {
  message: string
  id?: string
}
