import { Hono } from 'hono'
import type {
  AdminApiResponse,
  AISearchAdminDashboardData,
  AISearchSettingsData,
  TriggerAISearchIndexResponse,
} from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../../../../app'
import { requireAuth, requireRole } from '../../../../middleware'
import { AISearchService } from '../services/ai-search'
import { IndexManager } from '../services/indexer'
import type { AISearchSettings } from '../types'

const aiSearchAdminApiRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

aiSearchAdminApiRoutes.use('*', requireAuth())
aiSearchAdminApiRoutes.use('*', requireRole('admin'))

function success<T>(data: T, message?: string): AdminApiResponse<T> {
  return message ? { success: true, data, message } : { success: true, data }
}

function failure(error: string, message?: string): AdminApiResponse<never> {
  return message ? { success: false, error, message } : { success: false, error }
}

function createServices(c: any) {
  const db = c.env.DB
  const ai = c.env.AI
  const vectorize = c.env.VECTORIZE_INDEX

  return {
    service: new AISearchService(db, ai, vectorize),
    indexer: new IndexManager(db, ai, vectorize),
  }
}

function normalizeSettings(body: Record<string, unknown>, current?: AISearchSettings | null): Partial<AISearchSettings> {
  return {
    enabled: body.enabled !== undefined ? Boolean(body.enabled) : current?.enabled,
    ai_mode_enabled: body.ai_mode_enabled !== undefined ? Boolean(body.ai_mode_enabled) : current?.ai_mode_enabled,
    selected_collections: Array.isArray(body.selected_collections)
      ? body.selected_collections.map(String)
      : current?.selected_collections,
    dismissed_collections: Array.isArray(body.dismissed_collections)
      ? body.dismissed_collections.map(String)
      : current?.dismissed_collections,
    autocomplete_enabled: body.autocomplete_enabled !== undefined
      ? Boolean(body.autocomplete_enabled)
      : current?.autocomplete_enabled,
    cache_duration: body.cache_duration !== undefined ? Number(body.cache_duration) : current?.cache_duration,
    results_limit: body.results_limit !== undefined ? Number(body.results_limit) : current?.results_limit,
    index_media: body.index_media !== undefined ? Boolean(body.index_media) : current?.index_media,
  }
}

aiSearchAdminApiRoutes.get('/', async (c) => {
  try {
    const { service, indexer } = createServices(c)
    const settings = await service.getSettings()
    const [collections, newCollections, indexStatus, analytics] = await Promise.all([
      service.getAllCollections(),
      service.detectNewCollections(),
      indexer.getAllIndexStatus(),
      service.getSearchAnalytics(),
    ])

    return c.json(success<AISearchAdminDashboardData>({
      settings: settings as AISearchSettingsData,
      collections,
      newCollections,
      indexStatus,
      analytics,
    }))
  } catch (error) {
    console.error('Error fetching AI Search admin dashboard:', error)
    return c.json(failure('Failed to fetch AI Search dashboard'), 500)
  }
})

aiSearchAdminApiRoutes.get('/settings', async (c) => {
  try {
    const { service } = createServices(c)
    const settings = await service.getSettings()
    return c.json(success(settings as AISearchSettingsData))
  } catch (error) {
    console.error('Error fetching AI Search settings:', error)
    return c.json(failure('Failed to fetch AI Search settings'), 500)
  }
})

aiSearchAdminApiRoutes.put('/settings', async (c) => {
  try {
    const { service, indexer } = createServices(c)
    const body = await c.req.json<Record<string, unknown>>()
    const currentSettings = await service.getSettings()
    const updatedSettings = normalizeSettings(body, currentSettings)
    const collectionsChanged =
      JSON.stringify(updatedSettings.selected_collections) !==
      JSON.stringify(currentSettings?.selected_collections || [])

    const saved = await service.updateSettings(updatedSettings)

    if (collectionsChanged && updatedSettings.selected_collections) {
      c.executionCtx.waitUntil(indexer.syncAll(updatedSettings.selected_collections))
    }

    return c.json(success(saved as AISearchSettingsData, 'AI Search settings updated'))
  } catch (error) {
    console.error('Error updating AI Search settings:', error)
    return c.json(failure('Failed to update AI Search settings'), 500)
  }
})

aiSearchAdminApiRoutes.get('/collections', async (c) => {
  try {
    const { service } = createServices(c)
    const collections = await service.getAllCollections()
    return c.json(success(collections))
  } catch (error) {
    console.error('Error fetching AI Search collections:', error)
    return c.json(failure('Failed to fetch AI Search collections'), 500)
  }
})

aiSearchAdminApiRoutes.get('/status', async (c) => {
  try {
    const { indexer } = createServices(c)
    const status = await indexer.getAllIndexStatus()
    return c.json(success(status))
  } catch (error) {
    console.error('Error fetching AI Search index status:', error)
    return c.json(failure('Failed to fetch AI Search index status'), 500)
  }
})

aiSearchAdminApiRoutes.post('/index', async (c) => {
  try {
    const { indexer } = createServices(c)
    const body = await c.req.json<Record<string, unknown>>()
    const collectionId = body.collection_id ? String(body.collection_id) : ''

    if (!collectionId || collectionId === 'undefined' || collectionId === 'null') {
      return c.json(failure('collection_id is required'), 400)
    }

    c.executionCtx.waitUntil(indexer.indexCollection(collectionId))

    return c.json(success<TriggerAISearchIndexResponse>({ message: 'Indexing started' }, 'Indexing started'))
  } catch (error) {
    console.error('Error starting AI Search indexing:', error)
    return c.json(failure('Failed to start AI Search indexing'), 500)
  }
})

aiSearchAdminApiRoutes.get('/analytics', async (c) => {
  try {
    const { service } = createServices(c)
    const analytics = await service.getSearchAnalytics()
    return c.json(success(analytics))
  } catch (error) {
    console.error('Error fetching AI Search analytics:', error)
    return c.json(failure('Failed to fetch AI Search analytics'), 500)
  }
})

export default aiSearchAdminApiRoutes
