/**
 * User Profiles Plugin
 *
 * Configurable custom profile fields for users.
 * Developers call defineUserProfile() at app boot to declare custom fields
 * that are stored as JSON in user_profiles.data and rendered in the admin UI.
 *
 * API Routes:
 *   GET  /api/user-profiles/schema     → Public field definitions
 *   GET  /api/user-profiles/:userId    → Get custom data for a user (auth required)
 *   PUT  /api/user-profiles/:userId    → Update custom data for a user (auth required)
 */

import { Hono } from 'hono'
import { requireAuth } from '../../../middleware'
import { getUserProfileConfig } from './user-profile-registry'
import {
  getCustomData,
  saveCustomData,
  validateCustomData,
  sanitizeCustomData,
  extractCustomFieldsFromForm,
} from './user-profile-service'
import { renderCustomProfileSection } from './user-profile-renderer'

export function createUserProfilesFeature() {
  const api = new Hono()

  // GET /api/user-profiles/schema — public schema endpoint
  api.get('/schema', (c) => {
    const config = getUserProfileConfig()
    if (!config) {
      return c.json({ fields: [], registrationFields: [] })
    }
    return c.json({
      fields: config.fields
        .filter(f => !f.hidden)
        .map(f => ({
          name: f.name,
          label: f.label,
          type: f.type,
          options: f.options,
          required: f.required || false,
          placeholder: f.placeholder,
          helpText: f.helpText,
          default: f.default,
          validation: f.validation,
        })),
      registrationFields: config.registrationFields || [],
    })
  })

  // GET /api/user-profiles/:userId — get custom data
  api.get('/:userId', requireAuth(), async (c) => {
    const db = (c.env as any)?.DB || (c as any).db
    if (!db) return c.json({ error: 'Database not available' }, 500)

    const user = c.get('user') as { userId: string; role: string } | undefined
    const userId = c.req.param('userId')
    if (!user || (user.role !== 'admin' && user.userId !== userId)) {
      return c.json({ error: 'Access denied' }, 403)
    }

    const data = await getCustomData(db, userId)
    return c.json({ userId, customData: data })
  })

  // PUT /api/user-profiles/:userId — update custom data
  api.put('/:userId', requireAuth(), async (c) => {
    const db = (c.env as any)?.DB || (c as any).db
    if (!db) return c.json({ error: 'Database not available' }, 500)

    const user = c.get('user') as { userId: string; role: string } | undefined
    const userId = c.req.param('userId')
    if (!user || (user.role !== 'admin' && user.userId !== userId)) {
      return c.json({ error: 'Access denied' }, 403)
    }

    const config = getUserProfileConfig()
    if (!config) {
      return c.json({ error: 'No profile schema configured' }, 400)
    }

    const body = await c.req.json()
    const customData = body.customData || body

    const sanitized = sanitizeCustomData(customData, config)
    const validation = validateCustomData(sanitized, config)
    if (!validation.valid) {
      return c.json({ error: 'Validation failed', errors: validation.errors }, 400)
    }

    await saveCustomData(db, userId, sanitized)
    return c.json({ success: true })
  })

  return {
    routes: [{
      path: '/api/user-profiles',
      handler: api,
    }],
  }
}

export const userProfilesFeature = createUserProfilesFeature()

// Re-export public API
export {
  defineUserProfile,
  getUserProfileConfig,
  getProfileFieldDefaults,
  getRegistrationFields,
  type ProfileFieldDefinition,
  type UserProfileConfig,
} from './user-profile-registry'

export {
  getCustomData,
  saveCustomData,
  validateCustomData,
  sanitizeCustomData,
  extractCustomFieldsFromForm,
} from './user-profile-service'

export { renderCustomProfileSection } from './user-profile-renderer'
