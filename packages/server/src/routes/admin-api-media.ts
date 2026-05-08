import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware'
import {
  updateMediaSchema,
  type MediaListResponse,
  type MediaDetailResponse,
  type UploadMediaResponse,
  type MutateMediaResponse,
} from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../app'

export const adminApiMediaRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminApiMediaRoutes.use('*', requireAuth())
adminApiMediaRoutes.use('*', requireRole(['admin', 'editor', 'author']))

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function mapMediaRow(row: any): import('@worker-blog/shared/admin-api').MediaItem {
  return {
    id: row.id,
    filename: row.filename,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: row.size,
    width: row.width ?? null,
    height: row.height ?? null,
    folder: row.folder,
    publicUrl: `/files/${row.r2_key}`,
    thumbnailUrl: row.mime_type?.startsWith('image/') ? `/files/${row.r2_key}` : null,
    alt: row.alt ?? null,
    caption: row.caption ?? null,
    tags: row.tags ? JSON.parse(row.tags) : [],
    uploadedAt: row.uploaded_at ? new Date(Number(row.uploaded_at) * 1000).toISOString() : '',
    isImage: Boolean(row.mime_type?.startsWith('image/')),
    isVideo: Boolean(row.mime_type?.startsWith('video/')),
    isDocument: !row.mime_type?.startsWith('image/') && !row.mime_type?.startsWith('video/'),
  }
}

adminApiMediaRoutes.get('/', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)

  const db = c.env.DB
  const page = Math.max(1, Number(c.req.query('page') || '1'))
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') || '24')))
  const offset = (page - 1) * limit
  const folder = c.req.query('folder') || ''
  const type = c.req.query('type') || ''
  const search = c.req.query('search') || ''

  const conditions: string[] = ['deleted_at IS NULL']
  const params: unknown[] = []

  if (folder) { conditions.push('folder = ?'); params.push(folder) }
  if (type === 'images') { conditions.push('mime_type LIKE ?'); params.push('image/%') }
  else if (type === 'videos') { conditions.push('mime_type LIKE ?'); params.push('video/%') }
  else if (type === 'documents') {
    conditions.push('(mime_type = ? OR mime_type = ? OR mime_type LIKE ?)')
    params.push('application/pdf', 'text/plain', 'application/%document%')
  }
  if (search) { conditions.push('(filename LIKE ? OR original_name LIKE ?)'); params.push(`%${search}%`, `%${search}%`) }

  const where = `WHERE ${conditions.join(' AND ')}`

  try {
    const countRes = await db
      .prepare(`SELECT COUNT(*) as count FROM media ${where}`)
      .bind(...params)
      .first() as any
    const total = countRes?.count || 0

    const { results } = await db
      .prepare(`SELECT * FROM media ${where} ORDER BY uploaded_at DESC LIMIT ? OFFSET ?`)
      .bind(...params, limit, offset)
      .all()

    const { results: folderResults } = await db
      .prepare('SELECT folder, COUNT(*) as count, COALESCE(SUM(size),0) as totalSize FROM media WHERE deleted_at IS NULL GROUP BY folder ORDER BY folder')
      .all()

    const { results: typeResults } = await db
      .prepare(`SELECT CASE WHEN mime_type LIKE 'image/%' THEN 'images' WHEN mime_type LIKE 'video/%' THEN 'videos' ELSE 'documents' END as type, COUNT(*) as count FROM media WHERE deleted_at IS NULL GROUP BY type`)
      .all()

    const response: MediaListResponse = {
      items: (results || []).map(mapMediaRow),
      total,
      page,
      limit,
      folders: (folderResults || []).map((r: any) => ({ folder: r.folder, count: r.count, totalSize: r.totalSize })),
      types: (typeResults || []).map((r: any) => ({ type: r.type, count: r.count })),
    }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-media] Error fetching media:', error)
    return c.json({ error: 'Failed to fetch media' }, 500)
  }
})

adminApiMediaRoutes.get('/:id', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)
  const id = c.req.param('id')
  const db = c.env.DB

  try {
    const row = await db
      .prepare('SELECT * FROM media WHERE id = ? AND deleted_at IS NULL')
      .bind(id)
      .first() as any

    if (!row) return c.json({ error: 'Media item not found' }, 404)

    const response: MediaDetailResponse = { item: mapMediaRow(row) }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-media] Error fetching media item:', error)
    return c.json({ error: 'Failed to fetch media item' }, 500)
  }
})

adminApiMediaRoutes.post('/upload', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Authentication required' }, 401)

  if (!c.env.MEDIA_BUCKET) {
    return c.json({ error: 'Media storage (R2) is not configured' }, 503)
  }

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'Invalid multipart form data' }, 400)
  }

  const fileEntries = formData.getAll('files')
  const files: File[] = fileEntries.filter((e): e is File => e instanceof File)

  if (files.length === 0) return c.json({ error: 'No files provided' }, 400)

  const folder = (formData.get('folder') as string) || 'uploads'
  const uploaded: import('@worker-blog/shared/admin-api').MediaItem[] = []
  const errors: Array<{ filename: string; error: string }> = []
  const db = c.env.DB

  for (const file of files) {
    try {
      if (file.size > 50 * 1024 * 1024) {
        errors.push({ filename: file.name, error: 'File exceeds 50 MB limit' })
        continue
      }

      const fileId = crypto.randomUUID()
      const ext = file.name.split('.').pop() || ''
      const filename = ext ? `${fileId}.${ext}` : fileId
      const r2Key = `${folder}/${filename}`

      const arrayBuffer = await file.arrayBuffer()
      const putResult = await c.env.MEDIA_BUCKET.put(r2Key, arrayBuffer, {
        httpMetadata: { contentType: file.type },
        customMetadata: { originalName: file.name, uploadedBy: user.userId },
      })

      if (!putResult) {
        errors.push({ filename: file.name, error: 'Failed to upload to storage' })
        continue
      }

      const now = Math.floor(Date.now() / 1000)
      await db
        .prepare('INSERT INTO media (id, filename, original_name, mime_type, size, folder, r2_key, public_url, thumbnail_url, uploaded_by, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(
          fileId, filename, file.name, file.type, file.size, folder, r2Key,
          `/files/${r2Key}`,
          file.type.startsWith('image/') ? `/files/${r2Key}` : null,
          user.userId, now,
        )
        .run()

      uploaded.push({
        id: fileId,
        filename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        width: null,
        height: null,
        folder,
        publicUrl: `/files/${r2Key}`,
        thumbnailUrl: file.type.startsWith('image/') ? `/files/${r2Key}` : null,
        alt: null,
        caption: null,
        tags: [],
        uploadedAt: new Date(now * 1000).toISOString(),
        isImage: file.type.startsWith('image/'),
        isVideo: file.type.startsWith('video/'),
        isDocument: !file.type.startsWith('image/') && !file.type.startsWith('video/'),
      })
    } catch (err) {
      errors.push({ filename: file.name, error: err instanceof Error ? err.message : 'Unknown error' })
    }
  }

  const response: UploadMediaResponse = { uploaded, errors }
  return c.json(response, uploaded.length > 0 ? 201 : 400)
})

adminApiMediaRoutes.put('/:id', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)
  const id = c.req.param('id')

  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

  const parsed = updateMediaSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 422)

  const db = c.env.DB
  try {
    const existing = await db
      .prepare('SELECT id FROM media WHERE id = ? AND deleted_at IS NULL')
      .bind(id)
      .first()
    if (!existing) return c.json({ error: 'Media item not found' }, 404)

    const fields: string[] = []
    const vals: unknown[] = []
    if (parsed.data.alt !== undefined) { fields.push('alt = ?'); vals.push(parsed.data.alt) }
    if (parsed.data.caption !== undefined) { fields.push('caption = ?'); vals.push(parsed.data.caption) }
    if (parsed.data.tags !== undefined) { fields.push('tags = ?'); vals.push(JSON.stringify(parsed.data.tags)) }
    if (parsed.data.folder !== undefined) { fields.push('folder = ?'); vals.push(parsed.data.folder) }

    if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400)

    fields.push('updated_at = ?')
    vals.push(Date.now())
    vals.push(id)

    await db.prepare(`UPDATE media SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run()

    const response: MutateMediaResponse = { message: 'Media updated successfully' }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-media] Error updating media:', error)
    return c.json({ error: 'Failed to update media' }, 500)
  }
})

adminApiMediaRoutes.delete('/:id', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Authentication required' }, 401)
  const id = c.req.param('id')
  const db = c.env.DB

  try {
    const row = await db
      .prepare('SELECT id, r2_key FROM media WHERE id = ? AND deleted_at IS NULL')
      .bind(id)
      .first() as any
    if (!row) return c.json({ error: 'Media item not found' }, 404)

    if (c.env.MEDIA_BUCKET && row.r2_key) {
      try { await c.env.MEDIA_BUCKET.delete(row.r2_key) } catch (e) {
        console.warn('[admin-api-media] R2 delete failed:', e)
      }
    }

    await db
      .prepare('UPDATE media SET deleted_at = ? WHERE id = ?')
      .bind(Date.now(), id)
      .run()

    const response: MutateMediaResponse = { message: 'Media deleted successfully' }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-media] Error deleting media:', error)
    return c.json({ error: 'Failed to delete media' }, 500)
  }
})
