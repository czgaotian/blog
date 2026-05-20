import { CACHE_CONFIGS, getCacheService } from './cache'

export type ContentCreateMode = 'admin-create' | 'headless-create'
export type ContentDeleteMode = 'admin-soft' | 'headless-hard'
export type ContentUpdateMode = 'admin-update' | 'headless-update'

export interface CreateContentInput {
  collectionId: string
  title: string
  slug?: string
  status: string
  data: Record<string, unknown>
}

export interface CreateContentOptions {
  db: D1Database
  mode: ContentCreateMode
  input: CreateContentInput
  authorId: string
  cacheKv?: KVNamespace
  id?: string
  now?: number
}

export interface CreateContentResult {
  created: boolean
  collectionFound: boolean
  duplicateSlug?: boolean
  id?: string
  collectionId: string
  mode: ContentCreateMode
}

export interface UpdateContentPatch {
  title?: string
  slug?: string
  status?: string
  data?: unknown
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

export interface RestoreContentVersionOptions {
  db: D1Database
  id: string
  version: number
  authorId: string
  cacheKv?: KVNamespace
  now?: number
}

export interface RestoreContentVersionResult {
  restored: boolean
  id: string
  version: number
  collectionId?: string
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

export async function createContent(options: CreateContentOptions): Promise<CreateContentResult> {
  const { db, input, authorId, cacheKv } = options
  const slug = normalizeSlug(input.slug || input.title, { trim: options.mode === 'headless-create' })

  if (options.mode === 'admin-create') {
    const collection = await db
      .prepare('SELECT id FROM collections WHERE id = ? AND is_active = 1')
      .bind(input.collectionId)
      .first()

    if (!collection) {
      return {
        created: false,
        collectionFound: false,
        collectionId: input.collectionId,
        mode: options.mode,
      }
    }
  } else {
    const existing = await db
      .prepare('SELECT id FROM content WHERE collection_id = ? AND slug = ?')
      .bind(input.collectionId, slug)
      .first()

    if (existing) {
      return {
        created: false,
        collectionFound: true,
        duplicateSlug: true,
        collectionId: input.collectionId,
        mode: options.mode,
      }
    }
  }

  const id = options.id ?? crypto.randomUUID()
  const now = options.now ?? Date.now()
  const data = options.mode === 'admin-create'
    ? { ...input.data, title: input.title }
    : input.data

  await db
    .prepare('INSERT INTO content (id, collection_id, slug, title, data, status, author_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, input.collectionId, slug, input.title, JSON.stringify(data), input.status, authorId, now, now)
    .run()

  if (options.mode === 'admin-create') {
    await db
      .prepare('INSERT INTO content_versions (id, content_id, version, data, author_id, created_at) VALUES (?, ?, 1, ?, ?, ?)')
      .bind(crypto.randomUUID(), id, JSON.stringify(data), authorId, now)
      .run()
  }

  await invalidateContentCache(id, input.collectionId, cacheKv)

  return {
    created: true,
    collectionFound: true,
    id,
    collectionId: input.collectionId,
    mode: options.mode,
  }
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
  const newData = buildUpdatedContentData(options.mode, existingData, patch.data, newTitle)
  const newSlug = patch.slug
    ? normalizeSlug(patch.slug, { trim: options.mode === 'headless-update' })
    : existing.slug
  const newStatus = patch.status ?? existing.status

  await db
    .prepare('UPDATE content SET title = ?, slug = ?, data = ?, status = ?, updated_at = ? WHERE id = ?')
    .bind(newTitle, newSlug, JSON.stringify(newData), newStatus, now, id)
    .run()

  const dataChanged = JSON.stringify(existingData) !== JSON.stringify(newData)
  if (options.mode === 'admin-update' && dataChanged) {
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
    versionCreated: options.mode === 'admin-update' && dataChanged,
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

export async function restoreContentVersion(
  options: RestoreContentVersionOptions,
): Promise<RestoreContentVersionResult> {
  const { db, id, version, authorId, cacheKv } = options
  const versionRow = await db
    .prepare(`
      SELECT cv.data, c.collection_id
      FROM content_versions cv
      JOIN content c ON c.id = cv.content_id
      WHERE cv.content_id = ? AND cv.version = ?
    `)
    .bind(id, version)
    .first() as { data: string; collection_id: string } | null

  if (!versionRow) {
    return {
      restored: false,
      id,
      version,
    }
  }

  const data = parseContentData(versionRow.data)
  const now = options.now ?? Date.now()
  const versionCountRes = await db
    .prepare('SELECT MAX(version) as max_version FROM content_versions WHERE content_id = ?')
    .bind(id)
    .first() as any
  const nextVersion = (versionCountRes?.max_version || 0) + 1

  await db
    .prepare('UPDATE content SET data = ?, title = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify(data), String(data.title || 'Untitled'), now, id)
    .run()

  await db
    .prepare('INSERT INTO content_versions (id, content_id, version, data, author_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), id, nextVersion, JSON.stringify(data), authorId, now)
    .run()

  await invalidateContentCache(id, versionRow.collection_id, cacheKv)

  return {
    restored: true,
    id,
    version,
    collectionId: versionRow.collection_id,
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

function buildUpdatedContentData(
  mode: ContentUpdateMode,
  existingData: Record<string, unknown>,
  patchData: unknown,
  title: string,
): unknown {
  if (mode === 'headless-update') {
    return patchData !== undefined ? patchData : existingData
  }

  if (patchData && typeof patchData === 'object') {
    return { ...existingData, ...(patchData as Record<string, unknown>), title }
  }

  return existingData
}

function normalizeSlug(slug: string, options: { trim?: boolean } = {}): string {
  const normalized = slug
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  return options.trim ? normalized.trim() : normalized
}
