import { z } from 'zod'

export type ContentStatus = 'draft' | 'review' | 'scheduled' | 'published' | 'archived' | 'deleted'

export type TiptapJsonValue =
  | string
  | number
  | boolean
  | null
  | TiptapJsonValue[]
  | { [key: string]: TiptapJsonValue }

export interface TiptapDocument {
  type: 'doc'
  content?: TiptapJsonValue[]
  attrs?: Record<string, TiptapJsonValue>
}

const tiptapJsonValueSchema: z.ZodType<TiptapJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(tiptapJsonValueSchema),
    z.record(z.string(), tiptapJsonValueSchema),
  ]),
)

export const emptyTiptapDocument: TiptapDocument = {
  type: 'doc',
  content: [],
}

export const tiptapDocumentSchema = z.object({
  type: z.literal('doc'),
  content: z.array(tiptapJsonValueSchema).optional(),
  attrs: z.record(z.string(), tiptapJsonValueSchema).optional(),
}).passthrough()

export interface ContentCategorySummary {
  id: string
  name: string
  slug: string
}

export interface ContentTagSummary {
  id: string
  name: string
  slug: string
}

export interface ContentListItem {
  id: string
  title: string
  slug: string
  excerpt: string | null
  status: ContentStatus
  category: ContentCategorySummary | null
  coverImageId: string | null
  tags: ContentTagSummary[]
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
  excerpt: string | null
  bodyJson: TiptapDocument
  bodyHtml: string
  status: ContentStatus
  categoryId: string | null
  category: ContentCategorySummary | null
  coverImageId: string | null
  tags: ContentTagSummary[]
  tagIds: string[]
  metadata: Record<string, unknown>
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
  excerpt: string | null
  bodyJson: TiptapDocument
  status: ContentStatus
  categoryId: string | null
  coverImageId: string | null
  tagIds: string[]
  metadata: Record<string, unknown>
  publishedAt: string | null
  authorId: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export const createContentSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().max(500).optional(),
  excerpt: z.string().max(1000).nullable().optional(),
  bodyJson: tiptapDocumentSchema.optional().default(() => ({ type: 'doc' as const, content: [] })),
  status: z.enum(['draft', 'review', 'scheduled', 'published', 'archived']).optional().default('draft'),
  categoryId: z.string().nullable().optional(),
  coverImageId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional().default([]),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  publishedAt: z.string().nullable().optional(),
}).strict()

export const updateContentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  slug: z.string().max(500).optional(),
  excerpt: z.string().max(1000).nullable().optional(),
  bodyJson: tiptapDocumentSchema.optional(),
  status: z.enum(['draft', 'review', 'scheduled', 'published', 'archived', 'deleted']).optional(),
  categoryId: z.string().nullable().optional(),
  coverImageId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  publishedAt: z.string().nullable().optional(),
}).strict()

export type CreateContentRequest = z.infer<typeof createContentSchema>
export type UpdateContentRequest = z.infer<typeof updateContentSchema>

export interface MutateContentResponse {
  message: string
  id?: string
}
