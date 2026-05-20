import { CACHE_CONFIGS, getCacheService } from './cache'

export type ContentDeleteMode = 'admin-soft' | 'headless-hard'
export type ContentUpdateMode = 'admin-update'

export interface UpdateContentPatch {
  title?: string
  slug?: string
  status?: string
  data?: Record<string, unknown>
}

export interface UpdateContentOptions {
  db: D1Database
  id: string
  mode: ContentUpdateMode
  patch: UpdateContentPatch
  authorId: string
  cacheKv?: KVNamespace
  now?: number
}

export interface UpdateContentResult {
  found: boolean
  id: string
  mode: ContentUpdateMode
  collectionId?: string
  versionCreated?: boolean
}

export interface DeleteContentOptions {
  db: D1Database
  id: string
  mode: ContentDeleteMode
  cacheKv?: KVNamespace
  now?: number
}

export interface DeleteContentResult {
  found: boolean
  id: string
  collectionId?: string
  mode: ContentDeleteMode
}

export async function updateContent(options: UpdateContentOptions): Promise<UpdateContentResult> {
  const { db, id, patch, authorId, cacheKv } = options
  const existing = await db
    .prepare('SELECT * FROM content WHERE id = ?')
    .bind(id)
    .first() as any

  if (!existing) {
    return {
      found: false,
      id,
      mode: options.mode,
    }
  }

  const now = options.now ?? Date.now()
  const newTitle = patch.title ?? existing.title
  const existingData = parseContentData(existing.data)
  const newData = patch.data ? { ...existingData, ...patch.data, title: newTitle } : existingData
  const newSlug = patch.slug ? normalizeSlug(patch.slug) : existing.slug
  const newStatus = patch.status ?? existing.status

  await db
    .prepare('UPDATE content SET title = ?, slug = ?, data = ?, status = ?, updated_at = ? WHERE id = ?')
    .bind(newTitle, newSlug, JSON.stringify(newData), newStatus, now, id)
    .run()

  const dataChanged = JSON.stringify(existingData) !== JSON.stringify(newData)
  if (dataChanged) {
    const versionRes = await db
      .prepare('SELECT MAX(version) as max_version FROM content_versions WHERE content_id = ?')
      .bind(id)
      .first() as any
    const nextVersion = (versionRes?.max_version || 0) + 1

    await db
      .prepare('INSERT INTO content_versions (id, content_id, version, data, author_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), id, nextVersion, JSON.stringify(newData), authorId, now)
      .run()
  }

  await invalidateContentCache(id, existing.collection_id, cacheKv)

  return {
    found: true,
    id,
    mode: options.mode,
    collectionId: existing.collection_id,
    versionCreated: dataChanged,
  }
}

export async function deleteContent(options: DeleteContentOptions): Promise<DeleteContentResult> {
  const { db, id, mode, cacheKv } = options
  const existing = await db
    .prepare('SELECT id, collection_id FROM content WHERE id = ?')
    .bind(id)
    .first() as { id: string; collection_id: string } | null

  if (!existing) {
    return {
      found: false,
      id,
      mode,
    }
  }

  if (mode === 'admin-soft') {
    await db
      .prepare("UPDATE content SET status = 'deleted', updated_at = ? WHERE id = ?")
      .bind(options.now ?? Date.now(), id)
      .run()
  } else {
    await db
      .prepare('DELETE FROM content WHERE id = ?')
      .bind(id)
      .run()
  }

  await invalidateContentCache(id, existing.collection_id, cacheKv)

  return {
    found: true,
    id,
    collectionId: existing.collection_id,
    mode,
  }
}

export async function invalidateContentCache(
  id: string,
  collectionId: string,
  cacheKv?: KVNamespace,
): Promise<void> {
  const cache = getCacheService(CACHE_CONFIGS.api!, cacheKv)
  await cache.delete(cache.generateKey('content', id))
  await cache.invalidate(`content:list:${collectionId}:*`)
  await cache.invalidate('content-filtered:*')
}

function parseContentData(data: unknown): Record<string, unknown> {
  if (!data) return {}
  if (typeof data === 'object') return data as Record<string, unknown>

  try {
    return JSON.parse(String(data))
  } catch {
    return {}
  }
}

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
