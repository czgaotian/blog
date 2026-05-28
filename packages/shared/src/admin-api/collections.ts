import { z } from 'zod'

export const COLLECTION_FIELD_TYPES = [
  'text', 'slug', 'number', 'boolean', 'date',
  'select', 'radio', 'media', 'reference',
  'richtext', 'quill', 'markdown',
] as const

export type CollectionFieldType = typeof COLLECTION_FIELD_TYPES[number]

export interface CollectionField {
  id: string
  fieldName: string
  fieldLabel: string
  fieldType: string
  fieldOptions: Record<string, unknown>
  fieldOrder: number
  isRequired: boolean
  isSearchable: boolean
}

export interface CollectionListItem {
  id: string
  name: string
  displayName: string
  description: string | null
  isActive: boolean
  fieldCount: number
  createdAt: string
  updatedAt: string
}

export interface CollectionsListResponse {
  collections: CollectionListItem[]
  total: number
}

export interface CollectionDetailResponse {
  id: string
  name: string
  displayName: string
  description: string | null
  isActive: boolean
  fields: CollectionField[]
  createdAt: string
  updatedAt: string
}

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(255).regex(/^[a-z0-9_]+$/, 'Must contain only lowercase letters, numbers, and underscores'),
  displayName: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
})

export const updateCollectionSchema = z.object({
  displayName: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
})

export const createFieldSchema = z.object({
  fieldName: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'Must contain only lowercase letters, numbers, and underscores'),
  fieldLabel: z.string().min(1).max(255),
  fieldType: z.string().min(1),
  isRequired: z.boolean().optional().default(false),
  isSearchable: z.boolean().optional().default(false),
  fieldOptions: z.record(z.string(), z.unknown()).optional().default({}),
})

export const updateFieldSchema = z.object({
  fieldLabel: z.string().min(1).max(255).optional(),
  fieldType: z.string().min(1).optional(),
  isRequired: z.boolean().optional(),
  isSearchable: z.boolean().optional(),
  fieldOptions: z.record(z.string(), z.unknown()).optional(),
})

export type CreateCollectionRequest = z.infer<typeof createCollectionSchema>
export type UpdateCollectionRequest = z.infer<typeof updateCollectionSchema>
export type CreateFieldRequest = z.infer<typeof createFieldSchema>
export type UpdateFieldRequest = z.infer<typeof updateFieldSchema>

export interface MutateCollectionResponse {
  message: string
  id?: string
}
