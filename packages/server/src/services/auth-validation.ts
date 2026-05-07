/**
 * Auth Validation Service
 *
 * Provides server-side authentication validation helpers.
 */

import type { D1Database } from '@cloudflare/workers-types'
import {
  baseRegistrationSchema,
  generateRegistrationDefaultValue
} from '@worker-blog/shared/auth'
import type {
  AuthSettings,
  RegistrationData,
  RegistrationSchema
} from '@worker-blog/shared/auth'

export type {
  AuthSettings,
  RegistrationData,
  RegistrationSchema
} from '@worker-blog/shared/auth'

// In-memory cache for admin existence check (lazy initialization pattern)
let adminExistsCache: boolean | null = null

/**
 * Check if user registration is enabled in the auth plugin settings
 * @param db - D1 database instance
 * @returns true if registration is enabled, false if disabled
 */
export async function isRegistrationEnabled(db: D1Database): Promise<boolean> {
  try {
    const plugin = await db.prepare('SELECT settings FROM plugins WHERE id = ?')
      .bind('core-auth')
      .first() as { settings: string } | null

    if (plugin?.settings) {
      // Parse settings and check registration.enabled
      // SQLite stores booleans as 0/1, so check for both false and 0
      const settings = JSON.parse(plugin.settings)
      const enabled = settings?.registration?.enabled
      return enabled !== false && enabled !== 0
    }
    return true // Default to enabled if no settings
  } catch {
    return true // Default to enabled on error
  }
}

/**
 * Check if this would be the first user registration (bootstrap scenario)
 * The first user should always be allowed to register even if registration is disabled
 * @param db - D1 database instance
 * @returns true if no users exist in the database
 */
export async function isFirstUserRegistration(db: D1Database): Promise<boolean> {
  try {
    const result = await db.prepare('SELECT COUNT(*) as count FROM users').first() as { count: number } | null
    return result?.count === 0
  } catch {
    return false // Default to not first user on error
  }
}

/**
 * Check if an admin user exists in the database (with in-memory caching)
 * Uses lazy initialization - only queries DB on first call, then caches result
 * @param db - D1 database instance
 * @returns true if an admin user exists
 */
export async function checkAdminUserExists(db: D1Database): Promise<boolean> {
  // Return cached value if already checked
  if (adminExistsCache !== null) {
    return adminExistsCache
  }

  try {
    const result = await db.prepare('SELECT id FROM users WHERE role = ?')
      .bind('admin')
      .first()
    adminExistsCache = !!result
    return adminExistsCache
  } catch {
    // On error (e.g., table doesn't exist yet), assume no admin exists
    return false
  }
}

/**
 * Set the admin exists cache to true
 * Call this after successfully creating the first admin user
 */
export function setAdminExists(): void {
  adminExistsCache = true
}

/**
 * Reset the admin exists cache (for testing purposes)
 */
export function resetAdminExistsCache(): void {
  adminExistsCache = null
}

export const authValidationService = {
  /**
   * Build registration schema dynamically based on auth settings
   * For now, returns a static schema with standard fields
   */
  async buildRegistrationSchema(_db: D1Database): Promise<RegistrationSchema> {
    // TODO: Load settings from database to make fields optional/required dynamically
    // For now, use a static schema with common registration fields
    return baseRegistrationSchema
  },

  /**
   * Generate default values for optional fields
   */
  generateDefaultValue: generateRegistrationDefaultValue
}
