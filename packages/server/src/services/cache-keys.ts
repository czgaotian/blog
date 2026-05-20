export const contentCacheKeys = {
  item: (id: string): string => `api:content:${id}`,
  listByCollectionPattern: (collectionId: string): string => `content:list:${collectionId}:*`,
  filteredPattern: (): string => 'content-filtered:*',
}

export const collectionCacheKeys = {
  all: (): string => 'cache:collections:all',
  byName: (collectionName: string): string => `cache:collection:${collectionName}`,
}
