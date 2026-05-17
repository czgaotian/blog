/**
 * Built-in AI search feature.
 */

import apiRoutes from './routes/api'

export const aiSearchFeature = {
  routes: [{
    path: '/api/search',
    handler: apiRoutes as any,
  }],
}

export { AISearchService } from './services/ai-search'
export { IndexManager } from './services/indexer'
export type {
  AISearchSettings,
  SearchQuery,
  SearchResponse,
  SearchResult,
  CollectionInfo,
  IndexStatus,
} from './types'
