import { Hono, type Context } from 'hono'
import { z } from 'zod'
import {
  mediaFileIdsSchema,
  mediaListFiltersSchema,
  moveMediaSchema,
  updateMediaSchema,
  type BulkDeleteMediaResponse,
  type BulkMoveMediaResponse,
  type MediaDetailResponse,
  type MediaItem,
  type MediaListResponse,
  type MediaMutationError,
  type UploadMediaResponse,
} from '@worker-blog/shared/admin-api'
import { requireAuth } from '../middleware'
import type { Bindings, Variables } from '../app'

const MAX_FILE_SIZE = 50 * 1024 * 1024

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/avi',
  'video/mov',
  'audio/mp3',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/m4a',
])

const fileValidationSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().refine((type) => allowedMimeTypes.has(type), 'Unsupported file type'),
  size: z.number().min(1).max(MAX_FILE_SIZE),
})

const folderSchema = moveMediaSchema.shape.folder.default('uploads')

interface MediaRow {
  id: string
  filename: string
  original_name: string
  mime_type: string
  size: number
  width: number | null
  height: number | null
  folder: string
  r2_key: string
  public_url: string | null
  thumbnail_url: string | null
  alt: string | null
  caption: string | null
  tags: string | string[] | null
  uploaded_by: string
  uploaded_at: number | string | null
  deleted_at: number | string | null
}

type MediaContext = Context<{ Bindings: Bindings; Variables: Variables }>

export const apiMediaRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

apiMediaRoutes.use('*', requireAuth())

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 21)
}

async function emitEvent(eventName: string, data: unknown) {
  console.log(`[Event] ${eventName}:`, data)
}

function publicUrlForKey(r2Key: string): string {
  return `/files/${r2Key}`
}

function parseTags(value: MediaRow['tags']): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter((tag): tag is string => typeof tag === 'string')
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : []
  } catch {
    return []
  }
}

function mapMediaRow(row: MediaRow): MediaItem {
  const publicUrl = row.public_url || publicUrlForKey(row.r2_key)
  const isImage = row.mime_type.startsWith('image/')
  const isVideo = row.mime_type.startsWith('video/')

  return {
    id: row.id,
    filename: row.filename,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: Number(row.size),
    width: row.width ?? null,
    height: row.height ?? null,
    folder: row.folder,
    publicUrl,
    thumbnailUrl: row.thumbnail_url || (isImage ? publicUrl : null),
    alt: row.alt ?? null,
    caption: row.caption ?? null,
    tags: parseTags(row.tags),
    uploadedAt: row.uploaded_at ? new Date(Number(row.uploaded_at) * 1000).toISOString() : '',
    isImage,
    isVideo,
    isDocument: !isImage && !isVideo,
  }
}

function validationPayload(error: z.ZodError) {
  return {
    error: 'Validation failed',
    details: error.issues,
  }
}

function canMutate(file: MediaRow, user: { userId: string; role: string }) {
  return file.uploaded_by === user.userId || user.role === 'admin'
}

async function uploadOneFile(
  c: MediaContext,
  file: File,
  folder: string,
): Promise<{ item?: MediaItem; error?: MediaMutationError }> {
  const user = c.get('user')!
  const validation = fileValidationSchema.safeParse({
    name: file.name,
    type: file.type,
    size: file.size,
  })

  if (!validation.success) {
    return {
      error: {
        filename: file.name,
        error: 'Validation failed',
        details: validation.error.issues,
      },
    }
  }

  const fileId = generateId()
  const extension = file.name.includes('.') ? file.name.split('.').pop() || 'bin' : 'bin'
  const filename = `${fileId}.${extension}`
  const r2Key = `${folder}/${filename}`
  const arrayBuffer = await file.arrayBuffer()

  const uploadResult = await c.env.MEDIA_BUCKET.put(r2Key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type,
      contentDisposition: `inline; filename="${file.name.replace(/"/g, '')}"`,
    },
    customMetadata: {
      originalName: file.name,
      uploadedBy: user.userId,
      uploadedAt: new Date().toISOString(),
    },
  })

  if (!uploadResult) {
    return { error: { filename: file.name, error: 'Failed to upload to storage' } }
  }

  let width: number | null = null
  let height: number | null = null
  if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
    try {
      const dimensions = await getImageDimensions(arrayBuffer)
      width = dimensions.width || null
      height = dimensions.height || null
    } catch (error) {
      console.warn('Failed to extract image dimensions:', error)
    }
  }

  const publicUrl = publicUrlForKey(r2Key)
  const thumbnailUrl = file.type.startsWith('image/') ? publicUrl : null
  const uploadedAt = Math.floor(Date.now() / 1000)

  await c.env.DB.prepare(`
    INSERT INTO media (
      id, filename, original_name, mime_type, size, width, height,
      folder, r2_key, public_url, thumbnail_url, uploaded_by, uploaded_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      fileId,
      filename,
      file.name,
      file.type,
      file.size,
      width,
      height,
      folder,
      r2Key,
      publicUrl,
      thumbnailUrl,
      user.userId,
      uploadedAt,
    )
    .run()

  return {
    item: mapMediaRow({
      id: fileId,
      filename,
      original_name: file.name,
      mime_type: file.type,
      size: file.size,
      width,
      height,
      folder,
      r2_key: r2Key,
      public_url: publicUrl,
      thumbnail_url: thumbnailUrl,
      alt: null,
      caption: null,
      tags: null,
      uploaded_by: user.userId,
      uploaded_at: uploadedAt,
      deleted_at: null,
    }),
  }
}

apiMediaRoutes.get('/', async (c) => {
  const filters = mediaListFiltersSchema.safeParse({
    page: c.req.query('page'),
    limit: c.req.query('limit'),
    folder: c.req.query('folder'),
    type: c.req.query('type') || undefined,
    search: c.req.query('search'),
  })

  if (!filters.success) {
    return c.json(validationPayload(filters.error), 422)
  }

  const { page, limit, folder, type, search } = filters.data
  const conditions = ['deleted_at IS NULL']
  const params: unknown[] = []

  if (folder) {
    conditions.push('folder = ?')
    params.push(folder)
  }

  if (type === 'images') {
    conditions.push('mime_type LIKE ?')
    params.push('image/%')
  } else if (type === 'videos') {
    conditions.push('mime_type LIKE ?')
    params.push('video/%')
  } else if (type === 'documents') {
    conditions.push("mime_type NOT LIKE ? AND mime_type NOT LIKE ?")
    params.push('image/%', 'video/%')
  }

  if (search) {
    conditions.push('(filename LIKE ? OR original_name LIKE ? OR alt LIKE ? OR caption LIKE ?)')
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }

  const where = `WHERE ${conditions.join(' AND ')}`
  const offset = (page - 1) * limit

  try {
    const countRes = await c.env.DB.prepare(`SELECT COUNT(*) as count FROM media ${where}`)
      .bind(...params)
      .first() as { count?: number } | null

    const { results = [] } = await c.env.DB.prepare(`
      SELECT * FROM media ${where}
      ORDER BY uploaded_at DESC
      LIMIT ? OFFSET ?
    `)
      .bind(...params, limit, offset)
      .all<MediaRow>()

    const { results: folderResults = [] } = await c.env.DB.prepare(`
      SELECT folder, COUNT(*) as count, COALESCE(SUM(size), 0) as totalSize
      FROM media
      WHERE deleted_at IS NULL
      GROUP BY folder
      ORDER BY folder
    `).all<{ folder: string; count: number; totalSize: number }>()

    const { results: typeResults = [] } = await c.env.DB.prepare(`
      SELECT
        CASE
          WHEN mime_type LIKE 'image/%' THEN 'images'
          WHEN mime_type LIKE 'video/%' THEN 'videos'
          ELSE 'documents'
        END as type,
        COUNT(*) as count
      FROM media
      WHERE deleted_at IS NULL
      GROUP BY type
    `).all<{ type: 'images' | 'videos' | 'documents'; count: number }>()

    const response: MediaListResponse = {
      items: results.map(mapMediaRow),
      total: Number(countRes?.count || 0),
      page,
      limit,
      folders: folderResults.map((row) => ({
        folder: row.folder,
        count: Number(row.count),
        totalSize: Number(row.totalSize),
      })),
      types: typeResults.map((row) => ({
        type: row.type,
        count: Number(row.count),
      })),
    }

    return c.json(response)
  } catch (error) {
    console.error('[api-media] Error fetching media:', error)
    return c.json({ error: 'Failed to fetch media' }, 500)
  }
})

apiMediaRoutes.get('/:id', async (c) => {
  try {
    const row = await c.env.DB.prepare('SELECT * FROM media WHERE id = ? AND deleted_at IS NULL')
      .bind(c.req.param('id'))
      .first<MediaRow>()

    if (!row) return c.json({ error: 'Media item not found' }, 404)

    const response: MediaDetailResponse = { item: mapMediaRow(row) }
    return c.json(response)
  } catch (error) {
    console.error('[api-media] Error fetching media item:', error)
    return c.json({ error: 'Failed to fetch media item' }, 500)
  }
})

apiMediaRoutes.post('/upload', async (c) => {
  const formData = await c.req.formData()
  const fileData = formData.get('file')
  if (!fileData || typeof fileData === 'string') {
    return c.json({ error: 'No file provided' }, 400)
  }

  const folder = folderSchema.safeParse(formData.get('folder') || undefined)
  if (!folder.success) {
    return c.json(validationPayload(folder.error), 422)
  }

  try {
    const result = await uploadOneFile(c, fileData as File, folder.data)
    if (result.error || !result.item) {
      return c.json({ error: result.error?.error || 'Upload failed', details: result.error?.details }, 400)
    }

    await emitEvent('media.upload', { id: result.item.id, filename: result.item.filename })
    const response: UploadMediaResponse & { file: MediaItem } = {
      success: true,
      file: result.item,
      uploaded: [result.item],
      errors: [],
      summary: { total: 1, successful: 1, failed: 0 },
    }
    return c.json(response, 201)
  } catch (error) {
    console.error('[api-media] Upload error:', error)
    return c.json({ error: 'Upload failed' }, 500)
  }
})

apiMediaRoutes.post('/upload-multiple', async (c) => {
  const formData = await c.req.formData()
  const files = formData.getAll('files').filter((file): file is File => typeof file !== 'string')

  if (files.length === 0) {
    return c.json({ error: 'No files provided' }, 400)
  }

  const folder = folderSchema.safeParse(formData.get('folder') || undefined)
  if (!folder.success) {
    return c.json(validationPayload(folder.error), 422)
  }

  const uploaded: MediaItem[] = []
  const errors: MediaMutationError[] = []

  for (const file of files) {
    try {
      const result = await uploadOneFile(c, file, folder.data)
      if (result.item) uploaded.push(result.item)
      if (result.error) errors.push(result.error)
    } catch (error) {
      errors.push({
        filename: file.name,
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  if (uploaded.length > 0) {
    await emitEvent('media.upload', { count: uploaded.length })
  }

  const response: UploadMediaResponse = {
    success: uploaded.length > 0,
    uploaded,
    errors,
    summary: {
      total: files.length,
      successful: uploaded.length,
      failed: errors.length,
    },
  }

  return c.json(response, uploaded.length > 0 ? 201 : 400)
})

apiMediaRoutes.post('/bulk-delete', async (c) => {
  const user = c.get('user')!
  const body = mediaFileIdsSchema.safeParse(await c.req.json().catch(() => null))
  if (!body.success) {
    return c.json(validationPayload(body.error), 422)
  }

  const deleted: BulkDeleteMediaResponse['deleted'] = []
  const errors: MediaMutationError[] = []
  const now = Math.floor(Date.now() / 1000)

  for (const fileId of body.data.fileIds) {
    try {
      const file = await c.env.DB.prepare('SELECT * FROM media WHERE id = ?')
        .bind(fileId)
        .first<MediaRow>()

      if (!file) {
        errors.push({ fileId, error: 'File not found' })
        continue
      }

      if (!canMutate(file, user)) {
        errors.push({ fileId, filename: file.original_name, error: 'Permission denied' })
        continue
      }

      if (file.deleted_at !== null) {
        deleted.push({ fileId, filename: file.original_name, success: true, alreadyDeleted: true })
        continue
      }

      try {
        await c.env.MEDIA_BUCKET.delete(file.r2_key)
      } catch (error) {
        console.warn(`Failed to delete R2 object for media ${fileId}:`, error)
      }

      await c.env.DB.prepare('UPDATE media SET deleted_at = ?, updated_at = ? WHERE id = ?')
        .bind(now, now, fileId)
        .run()

      deleted.push({ fileId, filename: file.original_name, success: true })
    } catch (error) {
      errors.push({
        fileId,
        error: 'Delete failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  if (deleted.length > 0) {
    await emitEvent('media.delete', { count: deleted.length, ids: body.data.fileIds })
  }

  const response: BulkDeleteMediaResponse = {
    success: deleted.length > 0,
    deleted,
    errors,
    summary: {
      total: body.data.fileIds.length,
      successful: deleted.length,
      failed: errors.length,
    },
  }

  return c.json(response)
})

apiMediaRoutes.post('/bulk-move', async (c) => {
  const user = c.get('user')!
  const body = moveMediaSchema.safeParse(await c.req.json().catch(() => null))
  if (!body.success) {
    return c.json(validationPayload(body.error), 422)
  }

  const moved: BulkMoveMediaResponse['moved'] = []
  const errors: MediaMutationError[] = []
  const now = Math.floor(Date.now() / 1000)

  for (const fileId of body.data.fileIds) {
    try {
      const file = await c.env.DB.prepare('SELECT * FROM media WHERE id = ? AND deleted_at IS NULL')
        .bind(fileId)
        .first<MediaRow>()

      if (!file) {
        errors.push({ fileId, error: 'File not found' })
        continue
      }

      if (!canMutate(file, user)) {
        errors.push({ fileId, filename: file.original_name, error: 'Permission denied' })
        continue
      }

      if (file.folder === body.data.folder) {
        moved.push({ fileId, filename: file.original_name, success: true, skipped: true })
        continue
      }

      const filename = file.r2_key.split('/').pop() || file.filename
      const newR2Key = `${body.data.folder}/${filename}`
      const object = await c.env.MEDIA_BUCKET.get(file.r2_key)

      if (!object) {
        errors.push({ fileId, filename: file.original_name, error: 'File not found in storage' })
        continue
      }

      await c.env.MEDIA_BUCKET.put(newR2Key, object.body, {
        httpMetadata: object.httpMetadata,
        customMetadata: {
          ...object.customMetadata,
          movedBy: user.userId,
          movedAt: new Date().toISOString(),
        },
      })
      await c.env.MEDIA_BUCKET.delete(file.r2_key)

      await c.env.DB.prepare(`
        UPDATE media
        SET folder = ?, r2_key = ?, public_url = ?, thumbnail_url = ?, updated_at = ?
        WHERE id = ?
      `)
        .bind(
          body.data.folder,
          newR2Key,
          publicUrlForKey(newR2Key),
          file.mime_type.startsWith('image/') ? publicUrlForKey(newR2Key) : file.thumbnail_url,
          now,
          fileId,
        )
        .run()

      moved.push({ fileId, filename: file.original_name, success: true, skipped: false })
    } catch (error) {
      errors.push({
        fileId,
        error: 'Move failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  if (moved.length > 0) {
    await emitEvent('media.move', { count: moved.length, targetFolder: body.data.folder, ids: body.data.fileIds })
  }

  const response: BulkMoveMediaResponse = {
    success: moved.length > 0,
    moved,
    errors,
    summary: {
      total: body.data.fileIds.length,
      successful: moved.length,
      failed: errors.length,
    },
  }

  return c.json(response)
})

apiMediaRoutes.delete('/:id', async (c) => {
  const user = c.get('user')!
  const fileId = c.req.param('id')

  try {
    const file = await c.env.DB.prepare('SELECT * FROM media WHERE id = ? AND deleted_at IS NULL')
      .bind(fileId)
      .first<MediaRow>()

    if (!file) return c.json({ error: 'File not found' }, 404)
    if (!canMutate(file, user)) return c.json({ error: 'Permission denied' }, 403)

    try {
      await c.env.MEDIA_BUCKET.delete(file.r2_key)
    } catch (error) {
      console.warn(`Failed to delete R2 object for media ${fileId}:`, error)
    }

    const now = Math.floor(Date.now() / 1000)
    await c.env.DB.prepare('UPDATE media SET deleted_at = ?, updated_at = ? WHERE id = ?')
      .bind(now, now, fileId)
      .run()

    await emitEvent('media.delete', { id: fileId })
    return c.json({ success: true, message: 'File deleted successfully' })
  } catch (error) {
    console.error('[api-media] Delete error:', error)
    return c.json({ error: 'Delete failed' }, 500)
  }
})

apiMediaRoutes.patch('/:id', async (c) => {
  const user = c.get('user')!
  const fileId = c.req.param('id')
  const body = updateMediaSchema.safeParse(await c.req.json().catch(() => null))

  if (!body.success) {
    return c.json(validationPayload(body.error), 422)
  }

  const entries = Object.entries(body.data).filter(([, value]) => value !== undefined)
  if (entries.length === 0) {
    return c.json({ error: 'No valid fields to update' }, 400)
  }

  try {
    const file = await c.env.DB.prepare('SELECT * FROM media WHERE id = ? AND deleted_at IS NULL')
      .bind(fileId)
      .first<MediaRow>()

    if (!file) return c.json({ error: 'File not found' }, 404)
    if (!canMutate(file, user)) return c.json({ error: 'Permission denied' }, 403)

    const updates: string[] = []
    const values: unknown[] = []

    for (const [key, value] of entries) {
      updates.push(`${key} = ?`)
      values.push(key === 'tags' ? JSON.stringify(value) : value)
    }

    updates.push('updated_at = ?')
    values.push(Math.floor(Date.now() / 1000), fileId)

    await c.env.DB.prepare(`UPDATE media SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    await emitEvent('media.update', { id: fileId })
    return c.json({ success: true, message: 'File updated successfully' })
  } catch (error) {
    console.error('[api-media] Update error:', error)
    return c.json({ error: 'Update failed' }, 500)
  }
})

async function getImageDimensions(arrayBuffer: ArrayBuffer): Promise<{ width: number; height: number }> {
  const bytes = new Uint8Array(arrayBuffer)

  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return getJPEGDimensions(bytes)
  }

  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return getPNGDimensions(bytes)
  }

  return { width: 0, height: 0 }
}

function getJPEGDimensions(bytes: Uint8Array): { width: number; height: number } {
  let i = 2
  while (i < bytes.length) {
    if (i + 8 >= bytes.length) break
    const marker = bytes[i + 1]
    if (bytes[i] === 0xff && marker && marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: (bytes[i + 5]! << 8) | bytes[i + 6]!,
        width: (bytes[i + 7]! << 8) | bytes[i + 8]!,
      }
    }
    if (i + 3 >= bytes.length) break
    i += 2 + ((bytes[i + 2]! << 8) | bytes[i + 3]!)
  }
  return { width: 0, height: 0 }
}

function getPNGDimensions(bytes: Uint8Array): { width: number; height: number } {
  if (bytes.length < 24) return { width: 0, height: 0 }
  return {
    width: (bytes[16]! << 24) | (bytes[17]! << 16) | (bytes[18]! << 8) | bytes[19]!,
    height: (bytes[20]! << 24) | (bytes[21]! << 16) | (bytes[22]! << 8) | bytes[23]!,
  }
}

export default apiMediaRoutes
