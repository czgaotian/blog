import { z } from 'zod'

export const MEDIA_TYPES = ['images', 'videos', 'audio', 'documents', 'other'] as const
export type MediaTypeFilter = typeof MEDIA_TYPES[number]

export interface MediaItem {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
  publicUrl: string
  thumbnailUrl: string | null
  alt: string | null
  caption: string | null
  tags: string[]
  uploadedAt: string
  isImage: boolean
  isVideo: boolean
  isAudio: boolean
  isDocument: boolean
  isOther: boolean
}

export interface TypeStats {
  type: MediaTypeFilter
  count: number
}

export const mediaListFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  type: z.enum(MEDIA_TYPES).optional(),
  search: z.string().trim().max(200).optional().default(''),
})

export type MediaListFilters = z.infer<typeof mediaListFiltersSchema>

export interface MediaListResponse {
  items: MediaItem[]
  total: number
  page: number
  limit: number
  types: TypeStats[]
}

export interface MediaMutationSummary {
  total: number
  successful: number
  failed: number
}

export interface MediaDetailResponse {
  item: MediaItem
}

export interface MediaMutationError {
  fileId?: string
  filename?: string
  error: string
  details?: unknown
}

export interface UploadMediaResponse {
  success: boolean
  uploaded: MediaItem[]
  errors: MediaMutationError[]
  summary: MediaMutationSummary
}

export const updateMediaSchema = z.object({
  alt: z.string().trim().max(500).nullable().optional(),
  caption: z.string().trim().max(1000).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
})

export type UpdateMediaRequest = z.infer<typeof updateMediaSchema>

export const mediaFileIdsSchema = z.object({
  fileIds: z.array(z.string().min(1)).min(1).max(50),
})

export type MediaFileIdsRequest = z.infer<typeof mediaFileIdsSchema>

export interface BulkDeleteMediaResponse {
  success: boolean
  deleted: Array<{ fileId: string; filename: string; success: true; alreadyDeleted?: boolean }>
  errors: MediaMutationError[]
  summary: MediaMutationSummary
}

export interface MutateMediaResponse {
  success: boolean
  message: string
}
