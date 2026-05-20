export interface CreateCollectionInput {
  name: string
  displayName: string
  description?: string | null
}

export interface CreateCollectionOptions {
  db: D1Database
  input: CreateCollectionInput
  cacheKv?: KVNamespace
  id?: string
  now?: number
}

export type CreateCollectionResult =
  | { created: true; id: string; name: string }
  | { created: false; reason: 'duplicate'; name: string }

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

export async function createCollection(options: CreateCollectionOptions): Promise<CreateCollectionResult> {
  const { db, input, cacheKv } = options
  const existing = await db
    .prepare('SELECT id FROM collections WHERE name = ?')
    .bind(input.name)
    .first()

  if (existing) {
    return {
      created: false,
      reason: 'duplicate',
      name: input.name,
    }
  }

  const id = options.id ?? crypto.randomUUID()
  const now = options.now ?? Date.now()
  const schema = { type: 'object', properties: {}, required: [] }

  await db
    .prepare('INSERT INTO collections (id, name, display_name, description, schema, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)')
    .bind(id, input.name, input.displayName, input.description ?? null, JSON.stringify(schema), now, now)
    .run()

  await invalidateCollectionCache(cacheKv, input.name)

  return {
    created: true,
    id,
    name: input.name,
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
