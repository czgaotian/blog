export async function invalidateCollectionCache(
  cacheKv: KVNamespace | undefined,
  collectionName?: string,
): Promise<void> {
  if (!cacheKv) return

  try {
    await cacheKv.delete('cache:collections:all')
    if (collectionName) {
      await cacheKv.delete(`cache:collection:${collectionName}`)
    }
  } catch (error) {
    console.error('[collection-domain] Error clearing collection cache:', error)
  }
}

export interface DeleteCollectionOptions {
  db: D1Database
  id: string
  cacheKv?: KVNamespace
  blockManaged?: boolean
}

export type DeleteCollectionResult =
  | { deleted: true; id: string; name: string }
  | { deleted: false; reason: 'not_found' }
  | { deleted: false; reason: 'managed'; name: string }
  | { deleted: false; reason: 'has_content'; name: string; count: number }

export async function deleteCollection(options: DeleteCollectionOptions): Promise<DeleteCollectionResult> {
  const { db, id, cacheKv, blockManaged = true } = options
  const collection = await db
    .prepare('SELECT name, managed FROM collections WHERE id = ?')
    .bind(id)
    .first() as { name: string; managed?: number | boolean } | null

  if (!collection) {
    return { deleted: false, reason: 'not_found' }
  }

  if (blockManaged && Boolean(collection.managed)) {
    return { deleted: false, reason: 'managed', name: collection.name }
  }

  const contentResult = await db
    .prepare('SELECT COUNT(*) as count FROM content WHERE collection_id = ?')
    .bind(id)
    .first() as { count?: number } | null
  const contentCount = Number(contentResult?.count || 0)

  if (contentCount > 0) {
    return {
      deleted: false,
      reason: 'has_content',
      name: collection.name,
      count: contentCount,
    }
  }

  await db.prepare('DELETE FROM content_fields WHERE collection_id = ?').bind(id).run()
  await db.prepare('DELETE FROM collections WHERE id = ?').bind(id).run()
  await invalidateCollectionCache(cacheKv, collection.name)

  return {
    deleted: true,
    id,
    name: collection.name,
  }
}
