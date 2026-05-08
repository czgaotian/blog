import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware'
import { SettingsService } from '../services/settings'
import {
  updateGeneralSettingsSchema,
  updateSecuritySettingsSchema,
  type SettingsResponse,
} from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../app'

export const adminApiSettingsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminApiSettingsRoutes.use('*', requireAuth())
adminApiSettingsRoutes.use('*', requireRole(['admin']))

adminApiSettingsRoutes.get('/', async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  if (!user) return c.json({ error: 'Authentication required' }, 401)
  const service = new SettingsService(db)

  const [general, security] = await Promise.all([
    service.getGeneralSettings(user?.email),
    service.getSecuritySettings(),
  ])

  const response: SettingsResponse = { general, security }
  return c.json(response)
})

adminApiSettingsRoutes.put('/general', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const parsed = updateGeneralSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 422)
  }

  const service = new SettingsService(c.env.DB)
  const ok = await service.saveGeneralSettings(parsed.data)
  if (!ok) return c.json({ error: 'Failed to save settings' }, 500)

  return c.json({ message: 'General settings saved successfully' })
})

adminApiSettingsRoutes.put('/security', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const parsed = updateSecuritySettingsSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 422)
  }

  const service = new SettingsService(c.env.DB)
  const ok = await service.saveSecuritySettings(parsed.data)
  if (!ok) return c.json({ error: 'Failed to save settings' }, 500)

  return c.json({ message: 'Security settings saved successfully' })
})
