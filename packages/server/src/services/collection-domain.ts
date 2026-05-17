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
