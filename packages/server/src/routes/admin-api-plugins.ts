import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware'
import { PluginService } from '../services'
import { PLUGIN_REGISTRY } from '../plugins/manifest-registry'
import type { PluginsListResponse } from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../app'

export const adminApiPluginsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminApiPluginsRoutes.use('*', requireAuth())
adminApiPluginsRoutes.use('*', requireRole(['admin', 'editor']))

function formatLastUpdated(timestamp: number): string {
  const diff = Date.now() / 1000 - timestamp
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`
  if (diff < 2592000) return `${Math.floor(diff / 604800)} weeks ago`
  return `${Math.floor(diff / 2592000)} months ago`
}

adminApiPluginsRoutes.get('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Authentication required' }, 401)

  const pluginService = new PluginService(c.env.DB)

  let installedPlugins: any[] = []
  let rawStats = { total: 0, active: 0, inactive: 0, errors: 0, uninstalled: 0 }
  try {
    installedPlugins = await pluginService.getAllPlugins()
    rawStats = await pluginService.getPluginStats()
  } catch (e) {
    console.error('[admin-api-plugins] Failed to load plugins from DB', e)
  }

  const registryPlugins = Object.values(PLUGIN_REGISTRY)
  const installedIds = new Set(installedPlugins.map((p: any) => p.id))

  const installedItems = installedPlugins.map((p: any) => ({
    id: p.id,
    name: p.name,
    displayName: p.display_name,
    description: p.description ?? null,
    version: p.version,
    author: p.author,
    status: p.status as any,
    category: p.category,
    icon: p.icon ?? null,
    lastUpdated: p.last_updated ? formatLastUpdated(p.last_updated) : 'Unknown',
    isCore: Boolean(p.is_core),
    dependencies: p.dependencies ? (typeof p.dependencies === 'string' ? JSON.parse(p.dependencies) : p.dependencies) : [],
    permissions: p.permissions ? (typeof p.permissions === 'string' ? JSON.parse(p.permissions) : p.permissions) : [],
    errorMessage: p.error_message ?? null,
  }))

  const uninstalledItems = registryPlugins
    .filter(p => !installedIds.has(p.id))
    .map(p => ({
      id: p.id,
      name: p.codeName,
      displayName: p.displayName,
      description: p.description ?? null,
      version: p.version,
      author: p.author,
      status: 'uninstalled' as const,
      category: p.category,
      icon: p.iconEmoji ?? null,
      lastUpdated: 'Not installed',
      isCore: p.is_core,
      dependencies: p.dependencies,
      permissions: p.permissions,
      errorMessage: null,
    }))

  const uninstalledCount = uninstalledItems.length
  const totalCount = installedPlugins.length + uninstalledCount

  const response: PluginsListResponse = {
    plugins: [...installedItems, ...uninstalledItems],
    stats: {
      total: totalCount,
      active: rawStats.active,
      inactive: rawStats.inactive,
      error: rawStats.errors,  // map errors → error (matches PluginsStats field name)
      uninstalled: uninstalledCount,
    },
  }
  return c.json(response)
})
