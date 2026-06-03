import { CACHE_CONFIGS, getCacheService } from './cache'
import { contentCacheKeys } from './cache-keys'

export type ContentCreateMode = 'admin-create' | 'headless-create'
export type ContentDeleteMode = 'admin-soft' | 'headless-hard'
export type ContentUpdateMode = 'admin-update' | 'headless-update'

export interface CreateContentInput {
  title: string
  slug?: string
  status: string
  publishedAt?: string | null
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
  duplicateSlug?: boolean
  id?: string
  mode: ContentCreateMode
}

export interface UpdateContentPatch {
  title?: string
  slug?: string
  status?: string
  publishedAt?: string | null
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
  duplicateSlug?: boolean
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
  mode: ContentDeleteMode
}

interface ContentSnapshot {
  id: string
  title: string
  slug: string
  status: string
  publishedAt: string | null
  authorId: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export async function createContent(options: CreateContentOptions): Promise<CreateContentResult> {
  const { db, input, authorId, cacheKv } = options
  const slug = normalizeSlug(input.slug || input.title, { trim: options.mode === 'headless-create' })
  const duplicate = await db
    .prepare('SELECT id FROM content WHERE slug = ? AND deleted_at IS NULL')
    .bind(slug)
    .first()

  if (duplicate) {
    return {
      created: false,
      duplicateSlug: true,
      mode: options.mode,
    }
  }

  const id = options.id ?? crypto.randomUUID()
  const now = options.now ?? Date.now()
  const publishedAt = parseOptionalTimestamp(input.publishedAt)

  await db
    .prepare('INSERT INTO content (id, slug, title, status, published_at, author_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, slug, input.title, input.status, publishedAt, authorId, now, now)
    .run()

  if (options.mode === 'admin-create') {
    await db
      .prepare('INSERT INTO content_versions (id, content_id, version, data, author_id, created_at) VALUES (?, ?, 1, ?, ?, ?)')
      .bind(crypto.randomUUID(), id, JSON.stringify(createSnapshot({
        id,
        title: input.title,
        slug,
        status: input.status,
        published_at: publishedAt,
        author_id: authorId,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })), authorId, now)
      .run()
  }

  await invalidateContentCache(id, cacheKv)

  return {
    created: true,
    id,
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
  const newSlug = patch.slug
    ? normalizeSlug(patch.slug, { trim: options.mode === 'headless-update' })
    : existing.slug
  const newStatus = patch.status ?? existing.status
  const newPublishedAt = patch.publishedAt !== undefined
    ? parseOptionalTimestamp(patch.publishedAt)
    : existing.published_at

  if (newSlug !== existing.slug) {
    const duplicate = await db
      .prepare('SELECT id FROM content WHERE slug = ? AND id != ? AND deleted_at IS NULL')
      .bind(newSlug, id)
      .first()

    if (duplicate) {
      return {
        found: true,
        id,
        mode: options.mode,
        duplicateSlug: true,
      }
    }
  }

  await db
    .prepare('UPDATE content SET title = ?, slug = ?, status = ?, published_at = ?, updated_at = ? WHERE id = ?')
    .bind(newTitle, newSlug, newStatus, newPublishedAt, now, id)
    .run()

  const changed = newTitle !== existing.title
    || newSlug !== existing.slug
    || newStatus !== existing.status
    || Number(newPublishedAt ?? 0) !== Number(existing.published_at ?? 0)

  if (options.mode === 'admin-update' && changed) {
    const versionRes = await db
      .prepare('SELECT MAX(version) as max_version FROM content_versions WHERE content_id = ?')
      .bind(id)
      .first() as any
    const nextVersion = (versionRes?.max_version || 0) + 1

    await db
      .prepare('INSERT INTO content_versions (id, content_id, version, data, author_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), id, nextVersion, JSON.stringify(createSnapshot({
        ...existing,
        title: newTitle,
        slug: newSlug,
        status: newStatus,
        published_at: newPublishedAt,
        updated_at: now,
      })), authorId, now)
      .run()
  }

  await invalidateContentCache(id, cacheKv)

  return {
    found: true,
    id,
    mode: options.mode,
    versionCreated: options.mode === 'admin-update' && changed,
  }
}

export async function deleteContent(options: DeleteContentOptions): Promise<DeleteContentResult> {
  const { db, id, mode, cacheKv } = options
  const existing = await db
    .prepare('SELECT id FROM content WHERE id = ?')
    .bind(id)
    .first() as { id: string } | null

  if (!existing) {
    return {
      found: false,
      id,
      mode,
    }
  }

  if (mode === 'admin-soft') {
    await db
      .prepare("UPDATE content SET status = 'deleted', deleted_at = ?, updated_at = ? WHERE id = ?")
      .bind(options.now ?? Date.now(), options.now ?? Date.now(), id)
      .run()
  } else {
    await db
      .prepare('DELETE FROM content WHERE id = ?')
      .bind(id)
      .run()
  }

  await invalidateContentCache(id, cacheKv)

  return {
    found: true,
    id,
    mode,
  }
}

export async function restoreContentVersion(
  options: RestoreContentVersionOptions,
): Promise<RestoreContentVersionResult> {
  const { db, id, version, authorId, cacheKv } = options
  const versionRow = await db
    .prepare('SELECT data FROM content_versions WHERE content_id = ? AND version = ?')
    .bind(id, version)
    .first() as { data: string } | null

  if (!versionRow) {
    return {
      restored: false,
      id,
      version,
    }
  }

  const snapshot = parseSnapshot(versionRow.data)
  const now = options.now ?? Date.now()
  const versionCountRes = await db
    .prepare('SELECT MAX(version) as max_version FROM content_versions WHERE content_id = ?')
    .bind(id)
    .first() as any
  const nextVersion = (versionCountRes?.max_version || 0) + 1

  await db
    .prepare('UPDATE content SET title = ?, slug = ?, status = ?, published_at = ?, updated_at = ?, deleted_at = ? WHERE id = ?')
    .bind(snapshot.title, snapshot.slug, snapshot.status, parseOptionalTimestamp(snapshot.publishedAt), now, parseOptionalTimestamp(snapshot.deletedAt), id)
    .run()

  const restoredSnapshot: ContentSnapshot = {
    ...snapshot,
    updatedAt: new Date(now).toISOString(),
  }

  await db
    .prepare('INSERT INTO content_versions (id, content_id, version, data, author_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), id, nextVersion, JSON.stringify(restoredSnapshot), authorId, now)
    .run()

  await invalidateContentCache(id, cacheKv)

  return {
    restored: true,
    id,
    version,
  }
}

export async function invalidateContentCache(
  id: string,
  cacheKv?: KVNamespace,
): Promise<void> {
  const cache = getCacheService(CACHE_CONFIGS.api!, cacheKv)
  await cache.delete(contentCacheKeys.item(id))
  await cache.invalidate(contentCacheKeys.filteredPattern())
}

function createSnapshot(row: any): ContentSnapshot {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    publishedAt: toIsoString(row.published_at),
    authorId: row.author_id,
    createdAt: toIsoString(row.created_at) ?? new Date(0).toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? new Date(0).toISOString(),
    deletedAt: toIsoString(row.deleted_at),
  }
}

function parseSnapshot(data: unknown): ContentSnapshot {
  if (typeof data === 'object' && data) return data as ContentSnapshot

  try {
    return JSON.parse(String(data)) as ContentSnapshot
  } catch {
    return {
      id: '',
      title: 'Untitled',
      slug: 'untitled',
      status: 'draft',
      publishedAt: null,
      authorId: '',
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      deletedAt: null,
    }
  }
}

function parseOptionalTimestamp(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return value
  const timestamp = Date.parse(String(value))
  return Number.isNaN(timestamp) ? null : timestamp
}

function toIsoString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  const timestamp = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(timestamp)) return null
  return new Date(timestamp).toISOString()
}

function normalizeSlug(slug: string, options: { trim?: boolean } = {}): string {
  const normalized = slug
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  return options.trim ? normalized.trim() : normalized
}
