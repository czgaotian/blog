import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from '../middleware'
import type { Bindings, Variables } from '../app'
import type { MediaItem, MediaListResponse, MediaDetailResponse, UploadMediaResponse } from '@worker-blog/shared/admin-api'

// Helper function to generate short IDs (replacement for nanoid)
function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 21)
}

// Helper function for emitting events (simplified for core package)
async function emitEvent(eventName: string, data: any) {
  console.log(`[Event] ${eventName}:`, data)
  // TODO: Implement proper event system when plugin architecture is ready
}

// File validation schema
const fileValidationSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().refine(
    (type) => {
      const allowedTypes = [
        // Images
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        // Documents
        'application/pdf', 'text/plain', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        // Videos
        'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov',
        // Audio
        'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'
      ]
      return allowedTypes.includes(type)
    },
    { message: 'Unsupported file type' }
  ),
  size: z.number().min(1).max(50 * 1024 * 1024) // 50MB max
})

export const apiMediaRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Apply auth middleware to all routes
apiMediaRoutes.use('*', requireAuth())

function mapMediaRow(row: any): MediaItem {
  const publicUrl = row.public_url || `/files/${row.r2_key}`
  return {
    id: row.id,
    filename: row.filename,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: row.size,
    width: row.width ?? null,
    height: row.height ?? null,
    folder: row.folder,
    publicUrl,
    thumbnailUrl: row.thumbnail_url || (row.mime_type?.startsWith('image/') ? publicUrl : null),
    alt: row.alt ?? null,
    caption: row.caption ?? null,
    tags: row.tags ? JSON.parse(row.tags) : [],
    uploadedAt: row.uploaded_at ? new Date(Number(row.uploaded_at) * 1000).toISOString() : '',
    isImage: Boolean(row.mime_type?.startsWith('image/')),
    isVideo: Boolean(row.mime_type?.startsWith('video/')),
    isDocument: !row.mime_type?.startsWith('image/') && !row.mime_type?.startsWith('video/'),
  }
}

function toMediaItem(record: {
  id: string
  filename: string
  original_name: string
  mime_type: string
  size: number
  width: number | null
  height: number | null
  folder: string
  public_url: string
  thumbnail_url: string | null
  uploaded_at: number
}): MediaItem {
  return {
    id: record.id,
    filename: record.filename,
    originalName: record.original_name,
    mimeType: record.mime_type,
    size: record.size,
    width: record.width,
    height: record.height,
    folder: record.folder,
    publicUrl: record.public_url,
    thumbnailUrl: record.thumbnail_url,
    alt: null,
    caption: null,
    tags: [],
    uploadedAt: new Date(record.uploaded_at * 1000).toISOString(),
    isImage: record.mime_type.startsWith('image/'),
    isVideo: record.mime_type.startsWith('video/'),
    isDocument: !record.mime_type.startsWith('image/') && !record.mime_type.startsWith('video/'),
  }
}

apiMediaRoutes.get('/', async (c) => {
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
    console.error('[api-media] Error fetching media:', error)
    return c.json({ error: 'Failed to fetch media' }, 500)
  }
})

apiMediaRoutes.get('/:id', async (c) => {
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
    console.error('[api-media] Error fetching media item:', error)
    return c.json({ error: 'Failed to fetch media item' }, 500)
  }
})

// Upload single file
apiMediaRoutes.post('/upload', async (c) => {
  try {
    const user = c.get('user')!
    const formData = await c.req.formData()
    const fileData = formData.get('file')

    if (!fileData || typeof fileData === 'string') {
      return c.json({ error: 'No file provided' }, 400)
    }

    const file = fileData as File

    // Validate file
    const validation = fileValidationSchema.safeParse({
      name: file.name,
      type: file.type,
      size: file.size
    })

    if (!validation.success) {
      return c.json({ 
        error: 'File validation failed', 
        details: validation.error.issues 
      }, 400)
    }

    // Generate unique filename and R2 key
    const fileId = generateId()
    const fileExtension = file.name.split('.').pop() || ''
    const filename = `${fileId}.${fileExtension}`
    const folder = formData.get('folder') as string || 'uploads'
    const r2Key = `${folder}/${filename}`

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer()
    const uploadResult = await c.env.MEDIA_BUCKET.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        contentDisposition: `inline; filename="${file.name}"`
      },
      customMetadata: {
        originalName: file.name,
        uploadedBy: user.userId,
        uploadedAt: new Date().toISOString()
      }
    })

    if (!uploadResult) {
      return c.json({ error: 'Failed to upload file to storage' }, 500)
    }

    // Generate public URL using environment variable for bucket name
    const bucketName = c.env.BUCKET_NAME || 'worker-blog-media-dev'
    const publicUrl = `https://pub-${bucketName}.r2.dev/${r2Key}`
    
    // Extract image dimensions if it's an image
    let width: number | null = null
    let height: number | null = null
    
    if (file.type.startsWith('image/') && !file.type.includes('svg')) {
      try {
        const dimensions = await getImageDimensions(arrayBuffer)
        width = dimensions.width
        height = dimensions.height
      } catch (error) {
        console.warn('Failed to extract image dimensions:', error)
      }
    }

    // Generate thumbnail URL for images
    let thumbnailUrl: string | null = null
    if (file.type.startsWith('image/') && c.env.IMAGES_ACCOUNT_ID) {
      thumbnailUrl = `https://imagedelivery.net/${c.env.IMAGES_ACCOUNT_ID}/${r2Key}/thumbnail`
    }

    // Save to database
    const mediaRecord = {
      id: fileId,
      filename: filename,
      original_name: file.name,
      mime_type: file.type,
      size: file.size,
      width,
      height,
      folder,
      r2_key: r2Key,
      public_url: publicUrl,
      thumbnail_url: thumbnailUrl,
      uploaded_by: user.userId,
      uploaded_at: Math.floor(Date.now() / 1000),
      created_at: Math.floor(Date.now() / 1000)
    }

    const stmt = c.env.DB.prepare(`
      INSERT INTO media (
        id, filename, original_name, mime_type, size, width, height, 
        folder, r2_key, public_url, thumbnail_url, uploaded_by, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    await stmt.bind(
      mediaRecord.id,
      mediaRecord.filename,
      mediaRecord.original_name,
      mediaRecord.mime_type,
      mediaRecord.size,
      mediaRecord.width,
      mediaRecord.height,
      mediaRecord.folder,
      mediaRecord.r2_key,
      mediaRecord.public_url,
      mediaRecord.thumbnail_url,
      mediaRecord.uploaded_by,
      mediaRecord.uploaded_at
    ).run()

    // Emit media upload event
    await emitEvent('media.upload', { id: mediaRecord.id, filename: mediaRecord.filename })

    const item = toMediaItem(mediaRecord)
    const response: UploadMediaResponse & { success: true; file: MediaItem } = {
      success: true,
      file: item,
      uploaded: [item],
      errors: [],
    }
    return c.json(response)
  } catch (error) {
    console.error('Upload error:', error)
    return c.json({ error: 'Upload failed' }, 500)
  }
})

// Upload multiple files
apiMediaRoutes.post('/upload-multiple', async (c) => {
  try {
    const user = c.get('user')!
    const formData = await c.req.formData()
    const filesData = formData.getAll('files')

    // Filter out strings and ensure we only have File objects
    const files: File[] = []
    for (const f of filesData) {
      if (typeof f !== 'string') {
        files.push(f as File)
      }
    }

    if (!files || files.length === 0) {
      return c.json({ error: 'No files provided' }, 400)
    }

    const uploadResults = []
    const errors = []

    for (const file of files) {
      try {
        // Validate file
        const validation = fileValidationSchema.safeParse({
          name: file.name,
          type: file.type,
          size: file.size
        })

        if (!validation.success) {
          errors.push({
            filename: file.name,
            error: 'Validation failed',
            details: validation.error.issues
          })
          continue
        }

        // Generate unique filename and R2 key
        const fileId = generateId()
        const fileExtension = file.name.split('.').pop() || ''
        const filename = `${fileId}.${fileExtension}`
        const folder = formData.get('folder') as string || 'uploads'
        const r2Key = `${folder}/${filename}`

        // Upload to R2
        const arrayBuffer = await file.arrayBuffer()
        const uploadResult = await c.env.MEDIA_BUCKET.put(r2Key, arrayBuffer, {
          httpMetadata: {
            contentType: file.type,
            contentDisposition: `inline; filename="${file.name}"`
          },
          customMetadata: {
            originalName: file.name,
            uploadedBy: user.userId,
            uploadedAt: new Date().toISOString()
          }
        })

        if (!uploadResult) {
          errors.push({
            filename: file.name,
            error: 'Failed to upload to storage'
          })
          continue
        }

        // Generate public URL using environment variable for bucket name
        const bucketName = c.env.BUCKET_NAME || 'worker-blog-media-dev'
        const publicUrl = `https://pub-${bucketName}.r2.dev/${r2Key}`
        
        // Extract image dimensions if it's an image
        let width: number | null = null
        let height: number | null = null
        
        if (file.type.startsWith('image/') && !file.type.includes('svg')) {
          try {
            const dimensions = await getImageDimensions(arrayBuffer)
            width = dimensions.width
            height = dimensions.height
          } catch (error) {
            console.warn('Failed to extract image dimensions:', error)
          }
        }

        // Generate thumbnail URL for images
        let thumbnailUrl: string | null = null
        if (file.type.startsWith('image/') && c.env.IMAGES_ACCOUNT_ID) {
          thumbnailUrl = `https://imagedelivery.net/${c.env.IMAGES_ACCOUNT_ID}/${r2Key}/thumbnail`
        }

        // Save to database
        const mediaRecord = {
          id: fileId,
          filename: filename,
          original_name: file.name,
          mime_type: file.type,
          size: file.size,
          width,
          height,
          folder,
          r2_key: r2Key,
          public_url: publicUrl,
          thumbnail_url: thumbnailUrl,
          uploaded_by: user.userId,
          uploaded_at: Math.floor(Date.now() / 1000)
        }

        const stmt = c.env.DB.prepare(`
          INSERT INTO media (
            id, filename, original_name, mime_type, size, width, height, 
            folder, r2_key, public_url, thumbnail_url, uploaded_by, uploaded_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        
        await stmt.bind(
          mediaRecord.id,
          mediaRecord.filename,
          mediaRecord.original_name,
          mediaRecord.mime_type,
          mediaRecord.size,
          mediaRecord.width,
          mediaRecord.height,
          mediaRecord.folder,
          mediaRecord.r2_key,
          mediaRecord.public_url,
          mediaRecord.thumbnail_url,
          mediaRecord.uploaded_by,
          mediaRecord.uploaded_at
        ).run()

        uploadResults.push(toMediaItem(mediaRecord))
      } catch (error) {
        errors.push({
          filename: file.name,
          error: 'Upload failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Emit media upload event if any uploads succeeded
    if (uploadResults.length > 0) {
      await emitEvent('media.upload', { count: uploadResults.length })
    }

    return c.json({
      success: uploadResults.length > 0,
      uploaded: uploadResults,
      errors: errors,
      summary: {
        total: files.length,
        successful: uploadResults.length,
        failed: errors.length
      }
    })
  } catch (error) {
    console.error('Multiple upload error:', error)
    return c.json({ error: 'Upload failed' }, 500)
  }
})

// Bulk delete files
apiMediaRoutes.post('/bulk-delete', async (c) => {
  try {
    const user = c.get('user')!
    const body = await c.req.json()
    const fileIds = body.fileIds as string[]
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return c.json({ error: 'No file IDs provided' }, 400)
    }

    // Limit bulk operations to prevent abuse
    if (fileIds.length > 50) {
      return c.json({ error: 'Too many files selected. Maximum 50 files per operation.' }, 400)
    }

    const results = []
    const errors = []

    for (const fileId of fileIds) {
      try {
        // Get file record (including already deleted files to check if they exist at all)
        const stmt = c.env.DB.prepare('SELECT * FROM media WHERE id = ?')
        const fileRecord = await stmt.bind(fileId).first() as any

        if (!fileRecord) {
          errors.push({ fileId, error: 'File not found' })
          continue
        }

        // Skip if already deleted (treat as success)
        if (fileRecord.deleted_at !== null) {
          console.log(`File ${fileId} already deleted, skipping`)
          results.push({
            fileId,
            filename: fileRecord.original_name,
            success: true,
            alreadyDeleted: true
          })
          continue
        }

        // Check permissions (only allow deletion by uploader or admin)
        if (fileRecord.uploaded_by !== user.userId && user.role !== 'admin') {
          errors.push({ fileId, error: 'Permission denied' })
          continue
        }

        // Delete from R2
        try {
          await c.env.MEDIA_BUCKET.delete(fileRecord.r2_key)
        } catch (error) {
          console.warn(`Failed to delete from R2 for file ${fileId}:`, error)
          // Continue with database deletion even if R2 deletion fails
        }

        // Soft delete in database
        const deleteStmt = c.env.DB.prepare('UPDATE media SET deleted_at = ? WHERE id = ?')
        await deleteStmt.bind(Math.floor(Date.now() / 1000), fileId).run()

        results.push({
          fileId,
          filename: fileRecord.original_name,
          success: true
        })
      } catch (error) {
        errors.push({
          fileId,
          error: 'Delete failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Emit media delete event if any deletes succeeded
    if (results.length > 0) {
      await emitEvent('media.delete', { count: results.length, ids: fileIds })
    }

    return c.json({
      success: results.length > 0,
      deleted: results,
      errors: errors,
      summary: {
        total: fileIds.length,
        successful: results.length,
        failed: errors.length
      }
    })
  } catch (error) {
    console.error('Bulk delete error:', error)
    return c.json({ error: 'Bulk delete failed' }, 500)
  }
})

// Create folder
apiMediaRoutes.post('/create-folder', async (c) => {
  try {
    const body = await c.req.json()
    const folderName = body.folderName as string

    if (!folderName || typeof folderName !== 'string') {
      return c.json({ success: false, error: 'No folder name provided' }, 400)
    }

    // Validate folder name format
    const folderPattern = /^[a-z0-9-_]+$/
    if (!folderPattern.test(folderName)) {
      return c.json({
        success: false,
        error: 'Folder name can only contain lowercase letters, numbers, hyphens, and underscores'
      }, 400)
    }

    // Check if folder already exists in the database
    const checkStmt = c.env.DB.prepare('SELECT COUNT(*) as count FROM media WHERE folder = ? AND deleted_at IS NULL')
    const existingFolder = await checkStmt.bind(folderName).first() as any

    if (existingFolder && existingFolder.count > 0) {
      return c.json({
        success: false,
        error: `Folder "${folderName}" already exists`
      }, 400)
    }

    // Note: R2 folders are virtual - they only exist when files are uploaded to them
    // Return success message explaining this behavior
    return c.json({
      success: true,
      message: `Folder "${folderName}" is ready. Upload files to this folder to make it appear in the media library.`,
      folder: folderName,
      note: 'Folders appear automatically when you upload files to them'
    })
  } catch (error) {
    console.error('Create folder error:', error)
    return c.json({ success: false, error: 'Failed to create folder' }, 500)
  }
})

// Bulk move files to folder
apiMediaRoutes.post('/bulk-move', async (c) => {
  try {
    const user = c.get('user')!
    const body = await c.req.json()
    const fileIds = body.fileIds as string[]
    const targetFolder = body.folder as string

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return c.json({ error: 'No file IDs provided' }, 400)
    }

    if (!targetFolder || typeof targetFolder !== 'string') {
      return c.json({ error: 'No target folder provided' }, 400)
    }

    // Limit bulk operations to prevent abuse
    if (fileIds.length > 50) {
      return c.json({ error: 'Too many files selected. Maximum 50 files per operation.' }, 400)
    }

    const results = []
    const errors = []

    for (const fileId of fileIds) {
      try {
        // Get file record
        const stmt = c.env.DB.prepare('SELECT * FROM media WHERE id = ? AND deleted_at IS NULL')
        const fileRecord = await stmt.bind(fileId).first() as any

        if (!fileRecord) {
          errors.push({ fileId, error: 'File not found' })
          continue
        }

        // Check permissions (only allow move by uploader or admin)
        if (fileRecord.uploaded_by !== user.userId && user.role !== 'admin') {
          errors.push({ fileId, error: 'Permission denied' })
          continue
        }

        // Skip if already in target folder
        if (fileRecord.folder === targetFolder) {
          results.push({
            fileId,
            filename: fileRecord.original_name,
            success: true,
            skipped: true
          })
          continue
        }

        // Generate new R2 key with new folder
        const oldR2Key = fileRecord.r2_key
        const filename = oldR2Key.split('/').pop() || fileRecord.filename
        const newR2Key = `${targetFolder}/${filename}`

        // Copy file to new location in R2
        try {
          const object = await c.env.MEDIA_BUCKET.get(oldR2Key)
          if (!object) {
            errors.push({ fileId, error: 'File not found in storage' })
            continue
          }

          await c.env.MEDIA_BUCKET.put(newR2Key, object.body, {
            httpMetadata: object.httpMetadata,
            customMetadata: {
              ...object.customMetadata,
              movedBy: user.userId,
              movedAt: new Date().toISOString()
            }
          })

          // Delete old file from R2
          await c.env.MEDIA_BUCKET.delete(oldR2Key)
        } catch (error) {
          console.warn(`Failed to move file in R2 for file ${fileId}:`, error)
          errors.push({ fileId, error: 'Failed to move file in storage' })
          continue
        }

        // Update database with new folder and R2 key
        const bucketName = c.env.BUCKET_NAME || 'worker-blog-media-dev'
        const newPublicUrl = `https://pub-${bucketName}.r2.dev/${newR2Key}`

        const updateStmt = c.env.DB.prepare(`
          UPDATE media
          SET folder = ?, r2_key = ?, public_url = ?, updated_at = ?
          WHERE id = ?
        `)
        await updateStmt.bind(
          targetFolder,
          newR2Key,
          newPublicUrl,
          Math.floor(Date.now() / 1000),
          fileId
        ).run()

        results.push({
          fileId,
          filename: fileRecord.original_name,
          success: true,
          skipped: false
        })
      } catch (error) {
        errors.push({
          fileId,
          error: 'Move failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Emit media move event if any moves succeeded
    if (results.length > 0) {
      await emitEvent('media.move', { count: results.length, targetFolder, ids: fileIds })
    }

    return c.json({
      success: results.length > 0,
      moved: results,
      errors: errors,
      summary: {
        total: fileIds.length,
        successful: results.length,
        failed: errors.length
      }
    })
  } catch (error) {
    console.error('Bulk move error:', error)
    return c.json({ error: 'Bulk move failed' }, 500)
  }
})

// Delete file
apiMediaRoutes.delete('/:id', async (c) => {
  try {
    const user = c.get('user')!
    const fileId = c.req.param('id')
    
    // Get file record
    const stmt = c.env.DB.prepare('SELECT * FROM media WHERE id = ? AND deleted_at IS NULL')
    const fileRecord = await stmt.bind(fileId).first() as any
    
    if (!fileRecord) {
      return c.json({ error: 'File not found' }, 404)
    }

    // Check permissions (only allow deletion by uploader or admin)
    if (fileRecord.uploaded_by !== user.userId && user.role !== 'admin') {
      return c.json({ error: 'Permission denied' }, 403)
    }

    // Delete from R2
    try {
      await c.env.MEDIA_BUCKET.delete(fileRecord.r2_key)
    } catch (error) {
      console.warn('Failed to delete from R2:', error)
      // Continue with database deletion even if R2 deletion fails
    }

    // Soft delete in database
    const deleteStmt = c.env.DB.prepare('UPDATE media SET deleted_at = ? WHERE id = ?')
    await deleteStmt.bind(Math.floor(Date.now() / 1000), fileId).run()

    // Emit media delete event
    await emitEvent('media.delete', { id: fileId })

    return c.json({ success: true, message: 'File deleted successfully' })
  } catch (error) {
    console.error('Delete error:', error)
    return c.json({ error: 'Delete failed' }, 500)
  }
})

// Update file metadata
apiMediaRoutes.patch('/:id', async (c) => {
  try {
    const user = c.get('user')!
    const fileId = c.req.param('id')
    const body = await c.req.json()
    
    // Get file record
    const stmt = c.env.DB.prepare('SELECT * FROM media WHERE id = ? AND deleted_at IS NULL')
    const fileRecord = await stmt.bind(fileId).first() as any
    
    if (!fileRecord) {
      return c.json({ error: 'File not found' }, 404)
    }

    // Check permissions (only allow updates by uploader or admin)
    if (fileRecord.uploaded_by !== user.userId && user.role !== 'admin') {
      return c.json({ error: 'Permission denied' }, 403)
    }

    // Update allowed fields
    const allowedFields = ['alt', 'caption', 'tags', 'folder']
    const updates = []
    const values = []
    
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`)
        values.push(key === 'tags' ? JSON.stringify(value) : value)
      }
    }

    if (updates.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400)
    }

    updates.push('updated_at = ?')
    values.push(Math.floor(Date.now() / 1000))
    values.push(fileId)

    const updateStmt = c.env.DB.prepare(`
      UPDATE media SET ${updates.join(', ')} WHERE id = ?
    `)
    await updateStmt.bind(...values).run()

    // Emit media update event
    await emitEvent('media.update', { id: fileId })

    return c.json({ success: true, message: 'File updated successfully' })
  } catch (error) {
    console.error('Update error:', error)
    return c.json({ error: 'Update failed' }, 500)
  }
})

// Helper function to extract image dimensions
async function getImageDimensions(arrayBuffer: ArrayBuffer): Promise<{ width: number; height: number }> {
  // This is a simplified implementation
  // In a real-world scenario, you'd use a proper image processing library
  const uint8Array = new Uint8Array(arrayBuffer)
  
  // Check for JPEG
  if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
    return getJPEGDimensions(uint8Array)
  }
  
  // Check for PNG
  if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
    return getPNGDimensions(uint8Array)
  }
  
  // Default fallback
  return { width: 0, height: 0 }
}

function getJPEGDimensions(uint8Array: Uint8Array): { width: number; height: number } {
  let i = 2
  while (i < uint8Array.length) {
    if (i + 8 >= uint8Array.length) break
    if (uint8Array[i] === 0xFF && uint8Array[i + 1] === 0xC0) {
      if (i + 8 < uint8Array.length) {
        return {
          height: (uint8Array[i + 5]! << 8) | uint8Array[i + 6]!,
          width: (uint8Array[i + 7]! << 8) | uint8Array[i + 8]!
        }
      }
    }
    if (i + 3 < uint8Array.length) {
      i += 2 + ((uint8Array[i + 2]! << 8) | uint8Array[i + 3]!)
    } else {
      break
    }
  }
  return { width: 0, height: 0 }
}

function getPNGDimensions(uint8Array: Uint8Array): { width: number; height: number } {
  if (uint8Array.length < 24) {
    return { width: 0, height: 0 }
  }
  return {
    width: (uint8Array[16]! << 24) | (uint8Array[17]! << 16) | (uint8Array[18]! << 8) | uint8Array[19]!,
    height: (uint8Array[20]! << 24) | (uint8Array[21]! << 16) | (uint8Array[22]! << 8) | uint8Array[23]!
  }
}

export default apiMediaRoutes
