export const contentsCacheKeys = {
  item: (id: string): string => `api:contents:${id}`,
  filteredPattern: (): string => 'contents-filtered:*',
}
