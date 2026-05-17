import { CACHE_CONFIGS, getCacheService } from './cache'

export type ContentDeleteMode = 'admin-soft' | 'headless-hard'

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
