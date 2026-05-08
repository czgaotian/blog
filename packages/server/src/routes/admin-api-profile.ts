import { Hono } from 'hono'
import { requireAuth, AuthManager } from '../middleware'
import { sanitizeInput } from '@worker-blog/shared/utils/sanitize'
import {
  updateProfileSchema,
  changePasswordSchema,
  type UserProfileResponse,
  type MutateProfileResponse,
} from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../app'

export const adminApiProfileRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminApiProfileRoutes.use('*', requireAuth())

// GET /
adminApiProfileRoutes.get('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Authentication required' }, 401)
  const db = c.env.DB
  try {
    const row = await db
      .prepare(
        'SELECT id, email, username, first_name, last_name, phone, bio, avatar_url, timezone, language, theme, email_notifications, two_factor_enabled, role, created_at, last_login_at FROM users WHERE id = ? AND is_active = 1',
      )
      .bind(user.userId)
      .first() as any
    if (!row) return c.json({ error: 'User not found' }, 404)
    const response: UserProfileResponse = {
      id: row.id,
      email: row.email,
      username: row.username,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone ?? null,
      bio: row.bio ?? null,
      avatarUrl: row.avatar_url ?? null,
      timezone: row.timezone || 'UTC',
      language: row.language || 'en',
      theme: row.theme || 'dark',
      emailNotifications: Boolean(row.email_notifications),
      twoFactorEnabled: Boolean(row.two_factor_enabled),
      role: row.role,
      createdAt: new Date(Number(row.created_at)).toISOString(),
      lastLoginAt: row.last_login_at ? new Date(Number(row.last_login_at)).toISOString() : null,
    }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-profile] Error fetching profile:', error)
    return c.json({ error: 'Failed to fetch profile' }, 500)
  }
})

// PUT /
adminApiProfileRoutes.put('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Authentication required' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 422)

  const db = c.env.DB
  try {
    const existing = await db.prepare('SELECT id FROM users WHERE id = ? AND is_active = 1').bind(user.userId).first()
    if (!existing) return c.json({ error: 'User not found' }, 404)

    const dupeEmail = await db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').bind(parsed.data.email, user.userId).first()
    if (dupeEmail) return c.json({ error: 'Email already in use by another account' }, 409)

    const dupeUsername = await db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').bind(parsed.data.username, user.userId).first()
    if (dupeUsername) return c.json({ error: 'Username already in use by another account' }, 409)

    await db
      .prepare(
        'UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ?, phone = ?, bio = ?, timezone = ?, language = ?, email_notifications = ?, updated_at = ? WHERE id = ?',
      )
      .bind(
        sanitizeInput(parsed.data.firstName),
        sanitizeInput(parsed.data.lastName),
        sanitizeInput(parsed.data.username),
        parsed.data.email,
        parsed.data.phone ? sanitizeInput(parsed.data.phone) : null,
        parsed.data.bio ? sanitizeInput(parsed.data.bio) : null,
        parsed.data.timezone ?? 'UTC',
        parsed.data.language ?? 'en',
        parsed.data.emailNotifications ? 1 : 0,
        Date.now(),
        user.userId,
      )
      .run()

    const response: MutateProfileResponse = { message: 'Profile updated successfully' }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-profile] Error updating profile:', error)
    return c.json({ error: 'Failed to update profile' }, 500)
  }
})

// POST /password
adminApiProfileRoutes.post('/password', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Authentication required' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

  const parsed = changePasswordSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 422)
  if (parsed.data.newPassword !== parsed.data.confirmPassword) {
    return c.json({ error: 'Passwords do not match' }, 422)
  }

  const db = c.env.DB
  try {
    const row = await db.prepare('SELECT password_hash FROM users WHERE id = ? AND is_active = 1').bind(user.userId).first() as any
    if (!row) return c.json({ error: 'User not found' }, 404)

    const valid = await AuthManager.verifyPassword(parsed.data.currentPassword, row.password_hash)
    if (!valid) return c.json({ error: 'Current password is incorrect' }, 400)

    const newHash = await AuthManager.hashPassword(parsed.data.newPassword)
    await db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').bind(newHash, Date.now(), user.userId).run()

    const response: MutateProfileResponse = { message: 'Password changed successfully' }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-profile] Error changing password:', error)
    return c.json({ error: 'Failed to change password' }, 500)
  }
})

// POST /avatar
adminApiProfileRoutes.post('/avatar', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Authentication required' }, 401)

  try {
    const formData = await c.req.formData()
    const avatarFile = formData.get('avatar') as File | null
    if (!avatarFile || typeof avatarFile === 'string' || !avatarFile.name) {
      return c.json({ error: 'Please select an image file.' }, 400)
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(avatarFile.type)) {
      return c.json({ error: 'Please upload a valid image file (JPEG, PNG, GIF, or WebP).' }, 400)
    }

    if (avatarFile.size > 5 * 1024 * 1024) {
      return c.json({ error: 'Image file must be smaller than 5MB.' }, 400)
    }

    const ext = avatarFile.type.split('/')[1]
    const avatarUrl = `/uploads/avatars/${user.userId}-${Date.now()}.${ext}`

    const db = c.env.DB
    await db.prepare('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?').bind(avatarUrl, Date.now(), user.userId).run()

    return c.json({ message: 'Avatar updated successfully', avatarUrl })
  } catch (error) {
    console.error('[admin-api-profile] Error uploading avatar:', error)
    return c.json({ error: 'Failed to upload avatar' }, 500)
  }
})
