import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware'
import { PluginService } from '../services'
import { PLUGIN_REGISTRY } from '../plugins/manifest-registry'
import { updatePluginSettingsSchema, type PluginSettingsResponse } from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../app'

export const adminApiPluginSettingsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminApiPluginSettingsRoutes.use('*', requireAuth())
adminApiPluginSettingsRoutes.use('*', requireRole(['admin']))

adminApiPluginSettingsRoutes.get('/:id/settings', async (c) => {
  const pluginId = c.req.param('id')
  const db = c.env.DB
  const pluginService = new PluginService(db)

  try {
    const plugin = await pluginService.getPlugin(pluginId)
    if (!plugin) return c.json({ error: 'Plugin not found' }, 404)

    const manifest = PLUGIN_REGISTRY[pluginId]
    const schema = (manifest as any)?.settingsSchema || []

    const response: PluginSettingsResponse = {
      pluginId: plugin.id,
      displayName: plugin.display_name,
      description: plugin.description ?? null,
      version: plugin.version,
      status: plugin.status,
      settings: plugin.settings || {},
      schema,
    }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-plugin-settings] Error fetching plugin settings:', error)
    return c.json({ error: 'Failed to fetch plugin settings' }, 500)
  }
})

adminApiPluginSettingsRoutes.put('/:id/settings', async (c) => {
  const pluginId = c.req.param('id')
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const parsed = updatePluginSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 422)
  }

  const db = c.env.DB
  const pluginService = new PluginService(db)

  try {
    const plugin = await pluginService.getPlugin(pluginId)
    if (!plugin) return c.json({ error: 'Plugin not found' }, 404)

    await pluginService.updatePluginSettings(pluginId, parsed.data.settings)

    if (pluginId === 'core-auth' && c.env.CACHE_KV) {
      try {
        await c.env.CACHE_KV.delete('auth:settings')
        await c.env.CACHE_KV.delete('auth:registration-enabled')
      } catch (e) {
        console.error('[admin-api-plugin-settings] Failed to clear auth cache:', e)
      }
    }

    return c.json({ message: 'Plugin settings updated successfully' })
  } catch (error) {
    console.error('[admin-api-plugin-settings] Error updating plugin settings:', error)
    return c.json({ error: 'Failed to update plugin settings' }, 500)
  }
})
