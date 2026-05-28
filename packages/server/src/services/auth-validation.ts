import type { D1Database } from '@cloudflare/workers-types'

// In-memory cache for admin existence check (lazy initialization pattern)
let adminExistsCache: boolean | null = null

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
