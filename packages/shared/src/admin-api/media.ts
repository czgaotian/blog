import { z } from 'zod'

export interface MediaItem {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
  folder: string
  publicUrl: string
  thumbnailUrl: string | null
  alt: string | null
  caption: string | null
  tags: string[]
  uploadedAt: string
  isImage: boolean
  isVideo: boolean
  isDocument: boolean
}

export interface FolderStats {
  folder: string
  count: number
  totalSize: number
}

export interface TypeStats {
  type: string
  count: number
}

export interface MediaListResponse {
  items: MediaItem[]
  total: number
  page: number
  limit: number
  folders: FolderStats[]
  types: TypeStats[]
}

export interface MediaDetailResponse {
  item: MediaItem
}

export interface UploadMediaResponse {
  uploaded: MediaItem[]
  errors: Array<{ filename: string; error: string }>
}

export const updateMediaSchema = z.object({
  alt: z.string().max(500).optional(),
  caption: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  folder: z.string().max(100).optional(),
})

export type UpdateMediaRequest = z.infer<typeof updateMediaSchema>

export interface MutateMediaResponse {
  message: string
}
