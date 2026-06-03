export const contentCacheKeys = {
  item: (id: string): string => `api:content:${id}`,
  filteredPattern: (): string => 'content-filtered:*',
}
