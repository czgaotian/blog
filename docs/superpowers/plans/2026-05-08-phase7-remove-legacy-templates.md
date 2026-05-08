# Phase 7: Remove Legacy HTMX Templates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all legacy HTMX HTML-rendering routes and templates from the admin package and server, leaving only the React SPA for all `/admin/*` pages.

**Architecture:** Two new SPA features are needed before cleanup: a Profile page (`/admin/profile`) and an Activity Logs page (`/admin/activity-logs`). Each gets a JSON API endpoint added to the existing `admin-api-users` route, then a React page, then the legacy HTML routes are deleted. The final task deletes all remaining legacy HTML route files, template files, and removes their mounts from `app.ts`.

**Tech Stack:** Hono (server), Zod (validation), Vitest (tests), React + React Query + React Router (frontend), Tailwind CSS (styles), `@tanstack/react-query`, `@worker-blog/shared/admin-api`.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `packages/shared/src/admin-api/users.ts` | Add `UserProfileResponse`, `UpdateProfileRequest`, `ChangePasswordRequest`, `ActivityLogItem`, `ActivityLogsListResponse` types + Zod schemas |
| Modify | `packages/shared/src/admin-api/index.ts` | Re-export updated users module (already exports `./users` — no change needed if types are added there) |
| Modify | `packages/server/src/routes/admin-api-users.ts` | Add profile endpoints: `GET /profile`, `PUT /profile`, `POST /profile/password`, `POST /profile/avatar`; add activity log endpoints: `GET /activity-logs`, `GET /activity-logs/export` |
| Create | `packages/server/src/routes/admin-api-users.test.ts` | Vitest tests for all 6 new endpoints |
| Create | `packages/admin/src/spa/api/profile.ts` | React Query hooks for profile + activity logs |
| Create | `packages/admin/src/spa/pages/profile.tsx` | Profile page: edit info, change password, upload avatar |
| Create | `packages/admin/src/spa/pages/activity-logs.tsx` | Activity logs list page with filters |
| Modify | `packages/admin/src/spa/router.tsx` | Add `/admin/profile` and `/admin/activity-logs` routes |
| Modify | `packages/admin/src/spa/layouts/admin-layout.tsx` | Add Profile and Activity Logs nav items |
| Modify | `packages/server/src/routes/index.ts` | Remove all legacy HTML route exports |
| Modify | `packages/server/src/app.ts` | Remove all legacy HTML route mounts; ensure SPA catch-all takes effect |
| Delete | `packages/server/src/routes/admin-content.ts` | Legacy HTML content routes |
| Delete | `packages/server/src/routes/admin-users.ts` | Legacy HTML user/profile routes |
| Delete | `packages/server/src/routes/admin-dashboard.ts` | Legacy HTML dashboard routes |
| Delete | `packages/server/src/routes/admin-media.ts` | Legacy HTML media routes |
| Delete | `packages/server/src/routes/admin-forms.ts` | Legacy HTML forms routes |
| Delete | `packages/server/src/routes/admin-collections.ts` | Legacy HTML collections routes |
| Delete | `packages/server/src/routes/admin-plugins.ts` | Legacy HTML plugins routes |
| Delete | `packages/server/src/routes/admin-logs.ts` | Legacy HTML logs routes |
| Delete | `packages/server/src/routes/admin-settings.ts` | Legacy HTML settings routes |
| Delete | `packages/server/src/routes/admin-api-reference.ts` | Legacy HTML API reference routes (SPA version exists) |
| Delete | `packages/server/src/routes/admin-code-examples.ts` | Orphaned — not mounted |
| Delete | `packages/server/src/routes/admin-testimonials.ts` | Orphaned — not mounted |
| Delete | `packages/server/src/routes/admin-design.ts` | Orphaned placeholder |
| Delete | `packages/server/src/routes/admin-checkboxes.ts` | Orphaned placeholder |
| Delete | `packages/server/src/routes/admin-collections-field-types.ts` | Orphaned helper |
| Delete | `packages/server/src/routes/admin-content-field-types.ts` | Orphaned helper |
| Delete | `packages/admin/src/templates/` | All legacy HTMX template files (entire directory) |
| Modify | `packages/admin/src/index.ts` | Remove `export * from './templates'` |
| Modify | `docs/react-migration/task_plan.md` | Mark Phase 7 complete |

---

## Task 1: Shared types for profile and activity logs

**Files:**
- Modify: `packages/shared/src/admin-api/users.ts`

- [ ] **Step 1: Add types and schemas to the users shared types file**

Open `packages/shared/src/admin-api/users.ts` and append the following (after the existing exports):

```typescript
// Profile

export interface UserProfileResponse {
  id: string
  email: string
  username: string
  firstName: string
  lastName: string
  phone: string | null
  bio: string | null
  avatarUrl: string | null
  timezone: string
  language: string
  theme: string
  emailNotifications: boolean
  twoFactorEnabled: boolean
  role: string
  createdAt: string
  lastLoginAt: string | null
}

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  username: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
  bio: z.string().max(1000).optional(),
  timezone: z.string().max(100).optional().default('UTC'),
  language: z.string().max(10).optional().default('en'),
  emailNotifications: z.boolean().optional().default(true),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(1),
})

export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>

export interface MutateProfileResponse {
  message: string
}

// Activity Logs

export interface ActivityLogItem {
  id: string
  userId: string | null
  action: string
  resourceType: string | null
  resourceId: string | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  userEmail: string | null
  userName: string | null
}

export interface ActivityLogsListResponse {
  logs: ActivityLogItem[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}
```

Also ensure `z` is imported at the top of the file. Check if it already imports from `zod` — if not, add:
```typescript
import { z } from 'zod'
```

- [ ] **Step 2: Verify types compile**

```bash
pnpm --filter shared type-check 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/admin-api/users.ts
git commit -m "feat: add shared types for profile and activity logs (phase 7)"
```

---

## Task 2: Profile and activity-log API endpoints

**Files:**
- Modify: `packages/server/src/routes/admin-api-users.ts`

- [ ] **Step 1: Add 6 new endpoints to admin-api-users.ts**

Read `packages/server/src/routes/admin-api-users.ts` first to understand the file's current structure and existing imports. Then append the following six handlers to the bottom of the file (after the existing DELETE handler):

```typescript
import {
  // add to existing import from @worker-blog/shared/admin-api:
  updateProfileSchema,
  changePasswordSchema,
  type UserProfileResponse,
  type MutateProfileResponse,
  type ActivityLogItem,
  type ActivityLogsListResponse,
} from '@worker-blog/shared/admin-api'
import { AuthManager } from '../middleware'
import { sanitizeInput } from '@worker-blog/shared/utils/sanitize'
```

**Note:** The file already imports from `@worker-blog/shared/admin-api` and `../middleware`. Merge the new imports into the existing import statements rather than adding duplicate `import` lines.

Add these handlers at the end of the file:

```typescript
// GET /profile — current user's own profile
adminApiUsersRoutes.get('/profile', async (c) => {
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
    console.error('[admin-api-users] Error fetching profile:', error)
    return c.json({ error: 'Failed to fetch profile' }, 500)
  }
})

// PUT /profile — update current user's profile
adminApiUsersRoutes.put('/profile', async (c) => {
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

    // Check for duplicate email (excluding self)
    if (parsed.data.email) {
      const dupe = await db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').bind(parsed.data.email, user.userId).first()
      if (dupe) return c.json({ error: 'Email already in use by another account' }, 409)
    }

    // Check for duplicate username (excluding self)
    if (parsed.data.username) {
      const dupe = await db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').bind(parsed.data.username, user.userId).first()
      if (dupe) return c.json({ error: 'Username already in use by another account' }, 409)
    }

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
    console.error('[admin-api-users] Error updating profile:', error)
    return c.json({ error: 'Failed to update profile' }, 500)
  }
})

// POST /profile/password — change current user's password
adminApiUsersRoutes.post('/profile/password', async (c) => {
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
    console.error('[admin-api-users] Error changing password:', error)
    return c.json({ error: 'Failed to change password' }, 500)
  }
})

// POST /profile/avatar — upload avatar (stores URL path only; no actual file storage)
adminApiUsersRoutes.post('/profile/avatar', async (c) => {
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
    console.error('[admin-api-users] Error uploading avatar:', error)
    return c.json({ error: 'Failed to upload avatar' }, 500)
  }
})

// GET /activity-logs — list activity logs (admin only — already restricted by adminApiUsersRoutes middleware)
adminApiUsersRoutes.get('/activity-logs', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Authentication required' }, 401)

  const page = Math.max(1, Number(c.req.query('page') || 1))
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') || 50)))
  const action = c.req.query('action') || ''
  const resourceType = c.req.query('resource_type') || ''
  const dateFrom = c.req.query('date_from') || ''
  const dateTo = c.req.query('date_to') || ''
  const userId = c.req.query('user_id') || ''

  const db = c.env.DB
  try {
    const conditions: string[] = []
    const params: unknown[] = []

    if (action) { conditions.push('al.action LIKE ?'); params.push(`%${action}%`) }
    if (resourceType) { conditions.push('al.resource_type = ?'); params.push(resourceType) }
    if (dateFrom) { conditions.push('al.created_at >= ?'); params.push(new Date(dateFrom).getTime()) }
    if (dateTo) { conditions.push('al.created_at <= ?'); params.push(new Date(dateTo).getTime() + 86400000) }
    if (userId) { conditions.push('al.user_id = ?'); params.push(userId) }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRow = await db
      .prepare(`SELECT COUNT(*) as count FROM activity_logs al ${where}`)
      .bind(...params)
      .first() as any
    const total = Number(countRow?.count || 0)

    const { results } = await db
      .prepare(
        `SELECT al.id, al.user_id, al.action, al.resource_type, al.resource_id, al.details, al.ip_address, al.user_agent, al.created_at,
                u.email as user_email,
                COALESCE(u.first_name || ' ' || u.last_name, u.username, u.email) as user_name
         FROM activity_logs al
         LEFT JOIN users u ON al.user_id = u.id
         ${where}
         ORDER BY al.created_at DESC
         LIMIT ? OFFSET ?`,
      )
      .bind(...params, limit, (page - 1) * limit)
      .all()

    const logs: ActivityLogItem[] = (results || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id ?? null,
      action: row.action,
      resourceType: row.resource_type ?? null,
      resourceId: row.resource_id ?? null,
      details: row.details ? (typeof row.details === 'string' ? JSON.parse(row.details) : row.details) : null,
      ipAddress: row.ip_address ?? null,
      userAgent: row.user_agent ?? null,
      createdAt: new Date(Number(row.created_at)).toISOString(),
      userEmail: row.user_email ?? null,
      userName: row.user_name ?? null,
    }))

    const response: ActivityLogsListResponse = {
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-users] Error fetching activity logs:', error)
    return c.json({ error: 'Failed to fetch activity logs' }, 500)
  }
})

// GET /activity-logs/export — CSV export of activity logs
adminApiUsersRoutes.get('/activity-logs/export', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Authentication required' }, 401)

  const action = c.req.query('action') || ''
  const resourceType = c.req.query('resource_type') || ''
  const dateFrom = c.req.query('date_from') || ''
  const dateTo = c.req.query('date_to') || ''
  const userId = c.req.query('user_id') || ''

  const db = c.env.DB
  try {
    const conditions: string[] = []
    const params: unknown[] = []

    if (action) { conditions.push('al.action LIKE ?'); params.push(`%${action}%`) }
    if (resourceType) { conditions.push('al.resource_type = ?'); params.push(resourceType) }
    if (dateFrom) { conditions.push('al.created_at >= ?'); params.push(new Date(dateFrom).getTime()) }
    if (dateTo) { conditions.push('al.created_at <= ?'); params.push(new Date(dateTo).getTime() + 86400000) }
    if (userId) { conditions.push('al.user_id = ?'); params.push(userId) }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const { results } = await db
      .prepare(
        `SELECT al.id, al.user_id, al.action, al.resource_type, al.resource_id, al.details, al.ip_address, al.created_at,
                u.email as user_email,
                COALESCE(u.first_name || ' ' || u.last_name, u.username, u.email) as user_name
         FROM activity_logs al
         LEFT JOIN users u ON al.user_id = u.id
         ${where}
         ORDER BY al.created_at DESC
         LIMIT 10000`,
      )
      .bind(...params)
      .all()

    const csvRow = (fields: string[]) =>
      fields.map(f => `"${String(f ?? '').replace(/"/g, '""')}"`).join(',')

    const headers = ['Timestamp', 'User', 'Email', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'Details']
    const rows = (results || []).map((row: any) => csvRow([
      new Date(Number(row.created_at)).toISOString(),
      row.user_name ?? '',
      row.user_email ?? '',
      row.action,
      row.resource_type ?? '',
      row.resource_id ?? '',
      row.ip_address ?? '',
      row.details ? JSON.stringify(row.details) : '',
    ]))

    const csv = [csvRow(headers), ...rows].join('\n')
    const date = new Date().toISOString().slice(0, 10)

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="activity-logs-${date}.csv"`,
      },
    })
  } catch (error) {
    console.error('[admin-api-users] Error exporting activity logs:', error)
    return c.json({ error: 'Failed to export activity logs' }, 500)
  }
})
```

**Note on middleware:** `adminApiUsersRoutes` already applies `requireAuth()` and `requireRole(['admin'])` to all routes. The profile endpoints (GET/PUT/PUT profile, POST password/avatar) must also be accessible to non-admin users (editors, viewers). To allow this, add more permissive middleware specifically for profile routes, or — since the route file currently blocks non-admins globally — restructure to create a separate profile sub-router without the admin-only role restriction. Check how the existing `requireRole` is applied (is it `use('*', ...)`) and if so, you must either:

- Split profile routes into a separate sub-router (no role restriction, just requireAuth), OR
- Override the role check per handler by checking `c.get('user')` exists rather than a specific role

The cleanest approach: Create a separate `adminApiProfileRoutes` Hono instance mounted at `/admin/api/profile` in `app.ts` (instead of adding to `adminApiUsersRoutes`), with only `requireAuth()` middleware, not `requireRole`. This lets any authenticated user manage their own profile.

**Revised plan for step 1:** Create a new file `packages/server/src/routes/admin-api-profile.ts` for the 4 profile endpoints, and keep only the 2 activity-log endpoints in `admin-api-users.ts` (since those are admin-only).

**Revised file structure:**

New file: `packages/server/src/routes/admin-api-profile.ts`
```typescript
import { Hono } from 'hono'
import { requireAuth } from '../middleware'
import { AuthManager } from '../middleware'
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
```

And add to `admin-api-users.ts` (the 2 admin-only activity log endpoints):

```typescript
import {
  type ActivityLogItem,
  type ActivityLogsListResponse,
} from '@worker-blog/shared/admin-api'

// GET /activity-logs
adminApiUsersRoutes.get('/activity-logs', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Authentication required' }, 401)

  const page = Math.max(1, Number(c.req.query('page') || 1))
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') || 50)))
  const action = c.req.query('action') || ''
  const resourceType = c.req.query('resource_type') || ''
  const dateFrom = c.req.query('date_from') || ''
  const dateTo = c.req.query('date_to') || ''
  const filterUserId = c.req.query('user_id') || ''

  const db = c.env.DB
  try {
    const conditions: string[] = []
    const params: unknown[] = []

    if (action) { conditions.push('al.action LIKE ?'); params.push(`%${action}%`) }
    if (resourceType) { conditions.push('al.resource_type = ?'); params.push(resourceType) }
    if (dateFrom) { conditions.push('al.created_at >= ?'); params.push(new Date(dateFrom).getTime()) }
    if (dateTo) { conditions.push('al.created_at <= ?'); params.push(new Date(dateTo).getTime() + 86400000) }
    if (filterUserId) { conditions.push('al.user_id = ?'); params.push(filterUserId) }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countRow = await db
      .prepare(`SELECT COUNT(*) as count FROM activity_logs al ${where}`)
      .bind(...params)
      .first() as any
    const total = Number(countRow?.count || 0)

    const { results } = await db
      .prepare(
        `SELECT al.id, al.user_id, al.action, al.resource_type, al.resource_id, al.details, al.ip_address, al.user_agent, al.created_at,
                u.email as user_email,
                COALESCE(u.first_name || ' ' || u.last_name, u.username, u.email) as user_name
         FROM activity_logs al
         LEFT JOIN users u ON al.user_id = u.id
         ${where}
         ORDER BY al.created_at DESC
         LIMIT ? OFFSET ?`,
      )
      .bind(...params, limit, (page - 1) * limit)
      .all()

    const logs: ActivityLogItem[] = (results || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id ?? null,
      action: row.action,
      resourceType: row.resource_type ?? null,
      resourceId: row.resource_id ?? null,
      details: row.details ? (typeof row.details === 'string' ? JSON.parse(row.details) : row.details) : null,
      ipAddress: row.ip_address ?? null,
      userAgent: row.user_agent ?? null,
      createdAt: new Date(Number(row.created_at)).toISOString(),
      userEmail: row.user_email ?? null,
      userName: row.user_name ?? null,
    }))

    const response: ActivityLogsListResponse = {
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-users] Error fetching activity logs:', error)
    return c.json({ error: 'Failed to fetch activity logs' }, 500)
  }
})

// GET /activity-logs/export
adminApiUsersRoutes.get('/activity-logs/export', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Authentication required' }, 401)

  const action = c.req.query('action') || ''
  const resourceType = c.req.query('resource_type') || ''
  const dateFrom = c.req.query('date_from') || ''
  const dateTo = c.req.query('date_to') || ''
  const filterUserId = c.req.query('user_id') || ''

  const db = c.env.DB
  try {
    const conditions: string[] = []
    const params: unknown[] = []

    if (action) { conditions.push('al.action LIKE ?'); params.push(`%${action}%`) }
    if (resourceType) { conditions.push('al.resource_type = ?'); params.push(resourceType) }
    if (dateFrom) { conditions.push('al.created_at >= ?'); params.push(new Date(dateFrom).getTime()) }
    if (dateTo) { conditions.push('al.created_at <= ?'); params.push(new Date(dateTo).getTime() + 86400000) }
    if (filterUserId) { conditions.push('al.user_id = ?'); params.push(filterUserId) }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const { results } = await db
      .prepare(
        `SELECT al.id, al.user_id, al.action, al.resource_type, al.resource_id, al.details, al.ip_address, al.created_at,
                u.email as user_email,
                COALESCE(u.first_name || ' ' || u.last_name, u.username, u.email) as user_name
         FROM activity_logs al
         LEFT JOIN users u ON al.user_id = u.id
         ${where}
         ORDER BY al.created_at DESC
         LIMIT 10000`,
      )
      .bind(...params)
      .all()

    const csvRow = (fields: string[]) =>
      fields.map(f => `"${String(f ?? '').replace(/"/g, '""')}"`).join(',')

    const headers = ['Timestamp', 'User', 'Email', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'Details']
    const rows = (results || []).map((row: any) => csvRow([
      new Date(Number(row.created_at)).toISOString(),
      row.user_name ?? '',
      row.user_email ?? '',
      row.action,
      row.resource_type ?? '',
      row.resource_id ?? '',
      row.ip_address ?? '',
      row.details ? JSON.stringify(row.details) : '',
    ]))

    const csv = [csvRow(headers), ...rows].join('\n')
    const date = new Date().toISOString().slice(0, 10)

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="activity-logs-${date}.csv"`,
      },
    })
  } catch (error) {
    console.error('[admin-api-users] Error exporting activity logs:', error)
    return c.json({ error: 'Failed to export activity logs' }, 500)
  }
})
```

- [ ] **Step 2: Run type-check**

```bash
pnpm type-check 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/routes/admin-api-profile.ts packages/server/src/routes/admin-api-users.ts
git commit -m "feat: add profile and activity-log API endpoints (phase 7)"
```

---

## Task 3: Tests for profile and activity-log endpoints

**Files:**
- Create: `packages/server/src/routes/admin-api-profile.test.ts`
- Modify: `packages/server/src/routes/admin-api-users.test.ts` (add activity-log tests; file may already exist)

- [ ] **Step 1: Create profile test file**

`packages/server/src/routes/admin-api-profile.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

vi.mock('../middleware', () => ({
  requireAuth: () => async (c: any, next: any) => { await next() },
  requireRole: () => async (_c: any, next: any) => { await next() },
  AuthManager: {
    verifyPassword: vi.fn().mockResolvedValue(true),
    hashPassword: vi.fn().mockResolvedValue('new-hash'),
  },
}))

const mockUser = {
  id: 'u1', email: 'admin@test.com', username: 'admin',
  first_name: 'Admin', last_name: 'User',
  phone: null, bio: null, avatar_url: null,
  timezone: 'UTC', language: 'en', theme: 'dark',
  email_notifications: 1, two_factor_enabled: 0,
  role: 'admin', created_at: 1700000000000, last_login_at: null,
  password_hash: 'hash',
}

function makeMockDb() {
  const runCalls: string[] = []
  const db: any = {
    prepare: (sql: string) => ({
      bind: (..._args: any[]) => ({
        first: async () => {
          if (sql.includes('password_hash')) return { password_hash: 'old-hash' }
          if (sql.includes('SELECT id FROM users WHERE email')) return null
          if (sql.includes('SELECT id FROM users WHERE username')) return null
          if (sql.includes('SELECT id FROM users WHERE id')) return { id: 'u1' }
          if (sql.includes('SELECT id,') || sql.includes('SELECT id ')) return mockUser
          return mockUser
        },
        run: async () => { runCalls.push(sql); return {} },
        all: async () => ({ results: [] }),
      }),
    }),
  }
  return { db, runCalls }
}

const mockEnv = { DB: makeMockDb().db, CACHE_KV: { delete: async () => {} } }

import { adminApiProfileRoutes } from './admin-api-profile'

function createApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', { userId: 'u1', email: 'admin@test.com', role: 'admin', exp: 0, iat: 0 })
    await next()
  })
  app.route('/admin/api/profile', adminApiProfileRoutes)
  return app
}

describe('GET /admin/api/profile', () => {
  it('returns profile data', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/profile', {}, mockEnv)
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('email', 'admin@test.com')
    expect(json).toHaveProperty('firstName', 'Admin')
    expect(json).toHaveProperty('lastName', 'User')
    expect(json).toHaveProperty('timezone', 'UTC')
  })

  it('returns 401 when unauthenticated', async () => {
    const app = new Hono()
    app.route('/admin/api/profile', adminApiProfileRoutes)
    const res = await app.request('/admin/api/profile', {}, mockEnv)
    expect(res.status).toBe(401)
  })
})

describe('PUT /admin/api/profile', () => {
  it('updates profile and returns 200', async () => {
    const { db, runCalls } = makeMockDb()
    const app = createApp()
    const res = await app.request('/admin/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'New', lastName: 'Name', username: 'newuser', email: 'new@test.com', timezone: 'UTC', language: 'en', emailNotifications: true }),
    }, { ...mockEnv, DB: db })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json.message).toBe('Profile updated successfully')
    expect(runCalls.some(s => s.includes('UPDATE users SET'))).toBe(true)
  })

  it('returns 422 on validation failure', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: '' }),
    }, mockEnv)
    expect(res.status).toBe(422)
  })
})

describe('POST /admin/api/profile/password', () => {
  it('changes password successfully', async () => {
    const { db, runCalls } = makeMockDb()
    const app = createApp()
    const res = await app.request('/admin/api/profile/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'oldpass', newPassword: 'newpassword', confirmPassword: 'newpassword' }),
    }, { ...mockEnv, DB: db })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json.message).toBe('Password changed successfully')
    expect(runCalls.some(s => s.includes('UPDATE users SET password_hash'))).toBe(true)
  })

  it('returns 422 when passwords do not match', async () => {
    const app = createApp()
    const res = await app.request('/admin/api/profile/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'old', newPassword: 'new12345', confirmPassword: 'different' }),
    }, mockEnv)
    expect(res.status).toBe(422)
  })

  it('returns 400 when current password is wrong', async () => {
    vi.mocked((await import('../middleware')) as any).AuthManager.verifyPassword.mockResolvedValueOnce(false)
    const app = createApp()
    const res = await app.request('/admin/api/profile/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'wrong', newPassword: 'newpass123', confirmPassword: 'newpass123' }),
    }, mockEnv)
    expect(res.status).toBe(400)
  })
})

describe('POST /admin/api/profile/avatar', () => {
  it('updates avatar URL', async () => {
    const { db, runCalls } = makeMockDb()
    const app = createApp()
    const fd = new FormData()
    fd.append('avatar', new File(['img'], 'photo.jpg', { type: 'image/jpeg' }))
    const res = await app.request('/admin/api/profile/avatar', {
      method: 'POST',
      body: fd,
    }, { ...mockEnv, DB: db })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('avatarUrl')
    expect(runCalls.some(s => s.includes('UPDATE users SET avatar_url'))).toBe(true)
  })

  it('returns 400 for non-image file', async () => {
    const app = createApp()
    const fd = new FormData()
    fd.append('avatar', new File(['data'], 'file.txt', { type: 'text/plain' }))
    const res = await app.request('/admin/api/profile/avatar', { method: 'POST', body: fd }, mockEnv)
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Add activity-log tests to admin-api-users.test.ts**

Check if `packages/server/src/routes/admin-api-users.test.ts` exists. If it does, append to it. If not, create it with the full test structure (mock setup + these tests).

Append (or add in a new file with appropriate mock setup) the following describe blocks:

```typescript
import { adminApiUsersRoutes } from './admin-api-users'

// (reuse the same mock db pattern as profile tests)
const mockActivityLog = {
  id: 'log1', user_id: 'u1', action: 'content.create',
  resource_type: 'content', resource_id: 'c1',
  details: JSON.stringify({ title: 'Test' }),
  ip_address: '127.0.0.1', user_agent: 'Mozilla',
  created_at: 1700000000000,
  user_email: 'admin@test.com', user_name: 'Admin User',
}

describe('GET /admin/api/users/activity-logs', () => {
  it('returns activity logs list', async () => {
    const db: any = {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => {
            if (sql.includes('COUNT(*)')) return { count: 1 }
            return null
          },
          all: async () => ({ results: [mockActivityLog] }),
          run: async () => ({}),
        }),
      }),
    }
    const app = new Hono()
    app.use('*', async (c, next) => {
      c.set('user', { userId: 'u1', email: 'admin@test.com', role: 'admin', exp: 0, iat: 0 })
      await next()
    })
    app.route('/admin/api/users', adminApiUsersRoutes)
    const res = await app.request('/admin/api/users/activity-logs', {}, { DB: db, CACHE_KV: { delete: async () => {} } })
    expect(res.status).toBe(200)
    const json = await res.json() as any
    expect(json).toHaveProperty('logs')
    expect(json).toHaveProperty('pagination')
    expect(json.logs[0].action).toBe('content.create')
    expect(json.logs[0].userId).toBe('u1')
  })
})

describe('GET /admin/api/users/activity-logs/export', () => {
  it('returns CSV with correct content-type', async () => {
    const db: any = {
      prepare: () => ({
        bind: () => ({
          all: async () => ({ results: [mockActivityLog] }),
        }),
      }),
    }
    const app = new Hono()
    app.use('*', async (c, next) => {
      c.set('user', { userId: 'u1', email: 'admin@test.com', role: 'admin', exp: 0, iat: 0 })
      await next()
    })
    app.route('/admin/api/users', adminApiUsersRoutes)
    const res = await app.request('/admin/api/users/activity-logs/export', {}, { DB: db })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
    const text = await res.text()
    expect(text).toContain('Timestamp')
    expect(text).toContain('content.create')
  })
})
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter server test -- admin-api-profile admin-api-users 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/routes/admin-api-profile.test.ts packages/server/src/routes/admin-api-users.test.ts
git commit -m "test: add tests for profile and activity-log endpoints (phase 7)"
```

---

## Task 4: Wire profile route into app

**Files:**
- Modify: `packages/server/src/routes/index.ts`
- Modify: `packages/server/src/app.ts`

- [ ] **Step 1: Export from routes/index.ts**

Add after the `adminApiCollectionsRoutes` export line in `packages/server/src/routes/index.ts`:

```typescript
export { adminApiProfileRoutes } from './admin-api-profile'
```

- [ ] **Step 2: Mount in app.ts**

Add `adminApiProfileRoutes` to the import from `'./routes'` and mount it:

```typescript
app.route('/admin/api/profile', adminApiProfileRoutes)
```

Mount this **before** `app.route('/admin/api', adminApiRoutes)`.

- [ ] **Step 3: Run type-check and tests**

```bash
pnpm type-check 2>&1 | tail -5
pnpm --filter server test 2>&1 | tail -5
```

Expected: all tests pass, no type errors.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/routes/index.ts packages/server/src/app.ts
git commit -m "feat: mount admin-api-profile route (phase 7)"
```

---

## Task 5: React Query hooks for profile and activity logs

**Files:**
- Create: `packages/admin/src/spa/api/profile.ts`

- [ ] **Step 1: Create the hooks file**

`packages/admin/src/spa/api/profile.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  UserProfileResponse,
  MutateProfileResponse,
  UpdateProfileRequest,
  ChangePasswordRequest,
  ActivityLogsListResponse,
} from '@worker-blog/shared/admin-api'
import { adminFetch } from './client'

export function useProfile() {
  return useQuery<UserProfileResponse>({
    queryKey: ['admin', 'profile'],
    queryFn: () => adminFetch<UserProfileResponse>('/admin/api/profile'),
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation<MutateProfileResponse, Error, UpdateProfileRequest>({
    mutationFn: (data) =>
      adminFetch<MutateProfileResponse>('/admin/api/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'profile'] })
    },
  })
}

export function useChangePassword() {
  return useMutation<MutateProfileResponse, Error, ChangePasswordRequest>({
    mutationFn: (data) =>
      adminFetch<MutateProfileResponse>('/admin/api/profile/password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  })
}

export function useUploadAvatar() {
  const qc = useQueryClient()
  return useMutation<{ message: string; avatarUrl: string }, Error, File>({
    mutationFn: (file) => {
      const fd = new FormData()
      fd.append('avatar', file)
      return adminFetch<{ message: string; avatarUrl: string }>('/admin/api/profile/avatar', {
        method: 'POST',
        body: fd,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'profile'] })
    },
  })
}

export interface ActivityLogsFilters {
  page?: number
  limit?: number
  action?: string
  resourceType?: string
  dateFrom?: string
  dateTo?: string
  userId?: string
}

export function useActivityLogs(filters: ActivityLogsFilters = {}) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.action) params.set('action', filters.action)
  if (filters.resourceType) params.set('resource_type', filters.resourceType)
  if (filters.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters.dateTo) params.set('date_to', filters.dateTo)
  if (filters.userId) params.set('user_id', filters.userId)
  const qs = params.toString()
  return useQuery<ActivityLogsListResponse>({
    queryKey: ['admin', 'activity-logs', filters],
    queryFn: () => adminFetch<ActivityLogsListResponse>(`/admin/api/users/activity-logs${qs ? `?${qs}` : ''}`),
  })
}

export function activityLogsExportUrl(filters: ActivityLogsFilters = {}) {
  const params = new URLSearchParams()
  if (filters.action) params.set('action', filters.action)
  if (filters.resourceType) params.set('resource_type', filters.resourceType)
  if (filters.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters.dateTo) params.set('date_to', filters.dateTo)
  if (filters.userId) params.set('user_id', filters.userId)
  const qs = params.toString()
  return `/admin/api/users/activity-logs/export${qs ? `?${qs}` : ''}`
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/admin/src/spa/api/profile.ts
git commit -m "feat: add React Query hooks for profile and activity logs (phase 7)"
```

---

## Task 6: Profile page

**Files:**
- Create: `packages/admin/src/spa/pages/profile.tsx`

- [ ] **Step 1: Create the page**

`packages/admin/src/spa/pages/profile.tsx`:

```typescript
import { useState, useEffect, useRef } from 'react'
import { useProfile, useUpdateProfile, useChangePassword, useUploadAvatar } from '../api/profile'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { LoadingState } from '../components/ui/loading-state'
import { AdminApiError } from '../api/client'

export function ProfilePage() {
  const { data, isLoading, isError } = useProfile()
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const uploadAvatar = useUploadAvatar()

  // Profile form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [language, setLanguage] = useState('en')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [profileSaved, setProfileSaved] = useState(false)

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (data) {
      setFirstName(data.firstName)
      setLastName(data.lastName)
      setUsername(data.username)
      setEmail(data.email)
      setPhone(data.phone ?? '')
      setBio(data.bio ?? '')
      setTimezone(data.timezone)
      setLanguage(data.language)
      setEmailNotifications(data.emailNotifications)
    }
  }, [data])

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setProfileSaved(false)
    await updateProfile.mutateAsync({
      firstName, lastName, username, email,
      phone: phone || undefined,
      bio: bio || undefined,
      timezone, language, emailNotifications,
    })
    setProfileSaved(true)
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPasswordSaved(false)
    await changePassword.mutateAsync({ currentPassword, newPassword, confirmPassword })
    setPasswordSaved(true)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadAvatar.mutateAsync(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (isLoading) return <LoadingState label="Loading profile" />
  if (isError) return <Alert title="Failed to load profile" tone="danger">Try refreshing.</Alert>

  return (
    <section className="space-y-10">
      <PageHeader title="Profile" description="Manage your account settings." />

      {/* Avatar */}
      <div className="flex items-center gap-6 max-w-lg">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold text-muted-foreground shrink-0">
          {data?.avatarUrl ? (
            <img src={data.avatarUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <span>{(data?.firstName?.[0] ?? '?').toUpperCase()}</span>
          )}
        </div>
        <div className="space-y-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadAvatar.isPending}>
            {uploadAvatar.isPending ? 'Uploading…' : 'Change avatar'}
          </Button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleAvatarChange} />
          <p className="text-xs text-muted-foreground">JPEG, PNG, GIF or WebP, max 5MB</p>
          {uploadAvatar.isError && (
            <p className="text-xs text-destructive">
              {uploadAvatar.error instanceof AdminApiError ? uploadAvatar.error.message : 'Upload failed'}
            </p>
          )}
        </div>
      </div>

      {/* Profile info form */}
      <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-lg">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Personal info</h2>

        {updateProfile.isError && (
          <Alert title="Save failed" tone="danger">
            {updateProfile.error instanceof AdminApiError ? updateProfile.error.message : 'Unexpected error'}
          </Alert>
        )}
        {profileSaved && <Alert title="Saved" tone="success">Profile updated.</Alert>}

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} required />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="username">Username</Label>
          <Input id="username" value={username} onChange={e => setUsername(e.target.value)} required />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Input id="bio" value={bio} onChange={e => setBio(e.target.value)} placeholder="Optional" />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" value={timezone} onChange={e => setTimezone(e.target.value)} />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="language">Language</Label>
          <Input id="language" value={language} onChange={e => setLanguage(e.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={e => setEmailNotifications(e.target.checked)}
            className="rounded border-input"
          />
          Email notifications
        </label>

        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </form>

      {/* Change password form */}
      <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Change password</h2>

        {changePassword.isError && (
          <Alert title="Password change failed" tone="danger">
            {changePassword.error instanceof AdminApiError ? changePassword.error.message : 'Unexpected error'}
          </Alert>
        )}
        {passwordSaved && <Alert title="Done" tone="success">Password changed.</Alert>}

        <div className="grid gap-1.5">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input id="currentPassword" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
        </div>

        <Button type="submit" disabled={changePassword.isPending}>
          {changePassword.isPending ? 'Changing…' : 'Change password'}
        </Button>
      </form>
    </section>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/admin/src/spa/pages/profile.tsx
git commit -m "feat: add ProfilePage (phase 7)"
```

---

## Task 7: Activity logs page

**Files:**
- Create: `packages/admin/src/spa/pages/activity-logs.tsx`

- [ ] **Step 1: Create the page**

`packages/admin/src/spa/pages/activity-logs.tsx`:

```typescript
import { useState } from 'react'
import { useActivityLogs, activityLogsExportUrl, type ActivityLogsFilters } from '../api/profile'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { LoadingState } from '../components/ui/loading-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'

export function ActivityLogsPage() {
  const [filters, setFilters] = useState<ActivityLogsFilters>({ page: 1, limit: 50 })
  const [draftFilters, setDraftFilters] = useState({ action: '', resourceType: '', dateFrom: '', dateTo: '', userId: '' })
  const { data, isLoading, isError } = useActivityLogs(filters)

  function applyFilters(e: React.FormEvent) {
    e.preventDefault()
    setFilters({
      page: 1,
      limit: 50,
      action: draftFilters.action || undefined,
      resourceType: draftFilters.resourceType || undefined,
      dateFrom: draftFilters.dateFrom || undefined,
      dateTo: draftFilters.dateTo || undefined,
      userId: draftFilters.userId || undefined,
    })
  }

  function clearFilters() {
    setDraftFilters({ action: '', resourceType: '', dateFrom: '', dateTo: '', userId: '' })
    setFilters({ page: 1, limit: 50 })
  }

  const exportUrl = activityLogsExportUrl({
    action: filters.action,
    resourceType: filters.resourceType,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    userId: filters.userId,
  })

  return (
    <section className="space-y-6">
      <PageHeader
        title="Activity Logs"
        description="Audit trail of admin actions."
        actions={
          <a
            href={exportUrl}
            download
            className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
          >
            Export CSV
          </a>
        }
      />

      {/* Filters */}
      <form onSubmit={applyFilters} className="grid grid-cols-2 gap-4 max-w-2xl md:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="filterAction">Action</Label>
          <Input id="filterAction" value={draftFilters.action} onChange={e => setDraftFilters(f => ({ ...f, action: e.target.value }))} placeholder="e.g. content.create" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filterResourceType">Resource type</Label>
          <Input id="filterResourceType" value={draftFilters.resourceType} onChange={e => setDraftFilters(f => ({ ...f, resourceType: e.target.value }))} placeholder="e.g. content" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filterUserId">User ID</Label>
          <Input id="filterUserId" value={draftFilters.userId} onChange={e => setDraftFilters(f => ({ ...f, userId: e.target.value }))} placeholder="UUID" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filterDateFrom">From</Label>
          <Input id="filterDateFrom" type="date" value={draftFilters.dateFrom} onChange={e => setDraftFilters(f => ({ ...f, dateFrom: e.target.value }))} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filterDateTo">To</Label>
          <Input id="filterDateTo" type="date" value={draftFilters.dateTo} onChange={e => setDraftFilters(f => ({ ...f, dateTo: e.target.value }))} />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" size="sm">Filter</Button>
          <Button type="button" variant="outline" size="sm" onClick={clearFilters}>Clear</Button>
        </div>
      </form>

      {isLoading && <LoadingState label="Loading logs" />}

      {isError && (
        <Alert title="Failed to load logs" tone="danger">
          Could not fetch activity logs. Try refreshing.
        </Alert>
      )}

      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.logs.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center text-muted-foreground" colSpan={5}>
                    No logs found.
                  </TableCell>
                </TableRow>
              ) : (
                data.logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{log.userName ?? '—'}</div>
                      {log.userEmail && <div className="text-xs text-muted-foreground">{log.userEmail}</div>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.resourceType ? `${log.resourceType}${log.resourceId ? ` #${log.resourceId.slice(0, 8)}` : ''}` : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.ipAddress ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {data.pagination.pages > 1 && (
            <div className="flex items-center gap-3 justify-end text-sm">
              <Button
                type="button" variant="outline" size="sm"
                disabled={data.pagination.page <= 1}
                onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) - 1 }))}
              >
                Previous
              </Button>
              <span className="text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.pages}
              </span>
              <Button
                type="button" variant="outline" size="sm"
                disabled={data.pagination.page >= data.pagination.pages}
                onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) + 1 }))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/admin/src/spa/pages/activity-logs.tsx
git commit -m "feat: add ActivityLogsPage (phase 7)"
```

---

## Task 8: Wire new pages into router and nav

**Files:**
- Modify: `packages/admin/src/spa/router.tsx`
- Modify: `packages/admin/src/spa/layouts/admin-layout.tsx`

- [ ] **Step 1: Add routes to router.tsx**

Add imports:
```typescript
import { ProfilePage } from './pages/profile'
import { ActivityLogsPage } from './pages/activity-logs'
```

Add routes (after existing routes):
```typescript
{ path: 'profile', element: <ProfilePage /> },
{ path: 'activity-logs', element: <ActivityLogsPage /> },
```

- [ ] **Step 2: Add nav items to admin-layout.tsx**

Read the current nav items array. Add these entries in logical positions:

After the Settings nav item, add:
```typescript
{ label: 'Profile', href: '/admin/profile', icon: User },
```

After Logs, add (or in a sensible position):
```typescript
{ label: 'Activity Logs', href: '/admin/activity-logs', icon: Activity },
```

Check the available Lucide icons at the top of the file — `User` and `Activity` may already be imported. If not, add them to the `lucide-react` import.

- [ ] **Step 3: Type-check**

```bash
pnpm type-check 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/admin/src/spa/router.tsx packages/admin/src/spa/layouts/admin-layout.tsx
git commit -m "feat: wire Profile and Activity Logs routes into SPA (phase 7)"
```

---

## Task 9: Delete legacy HTML routes and update app.ts

**Files:**
- Modify: `packages/server/src/routes/index.ts` — remove legacy exports
- Modify: `packages/server/src/app.ts` — remove legacy route mounts
- Delete: all `admin-*.ts` files that are NOT `admin-api-*.ts` and NOT `admin-spa.ts`

- [ ] **Step 1: Remove exports from routes/index.ts**

In `packages/server/src/routes/index.ts`, remove these lines:

```typescript
export { default as adminContentRoutes } from './admin-content'
export { userRoutes as adminUsersRoutes } from './admin-users'
export { adminMediaRoutes } from './admin-media'
export { adminPluginRoutes } from './admin-plugins'
export { adminLogsRoutes } from './admin-logs'
export { adminDesignRoutes } from './admin-design'
export { adminCheckboxRoutes } from './admin-checkboxes'
export { default as adminTestimonialsRoutes } from './admin-testimonials'
export { default as adminCodeExamplesRoutes } from './admin-code-examples'
export { adminDashboardRoutes } from './admin-dashboard'
export { adminCollectionsRoutes } from './admin-collections'
export { adminSettingsRoutes } from './admin-settings'
export { adminFormsRoutes } from './admin-forms'
export { adminApiReferenceRoutes } from './admin-api-reference'
```

- [ ] **Step 2: Remove route mounts from app.ts**

In `packages/server/src/app.ts`:

1. Remove from the imports: `adminContentRoutes`, `adminUsersRoutes`, `adminMediaRoutes`, `adminPluginRoutes`, `adminLogsRoutes`, `adminDesignRoutes`, `adminCheckboxRoutes`, `adminTestimonialsRoutes`, `adminCodeExamplesRoutes`, `adminDashboardRoutes`, `adminCollectionsRoutes`, `adminSettingsRoutes`, `adminFormsRoutes`, `adminApiReferenceRoutes`.

2. Remove these `app.route(...)` calls:
   ```typescript
   app.route('/admin/dashboard', adminDashboardRoutes)
   app.route('/admin/collections', adminCollectionsRoutes)
   app.route('/admin/forms', adminFormsRoutes)
   app.route('/admin/settings', adminSettingsRoutes)
   app.route('/admin/api-reference', adminApiReferenceRoutes)
   app.route('/admin/content', adminContentRoutes)
   app.route('/admin/media', adminMediaRoutes)
   app.route('/admin/plugins', adminPluginRoutes)
   app.route('/admin/logs', adminLogsRoutes)
   app.route('/admin', adminUsersRoutes)
   ```

3. Verify the SPA catch-all route `app.route('/', createAdminSpaRoutes())` is still present — it handles all `/admin/*` fallthrough.

- [ ] **Step 3: Delete legacy route files**

```bash
rm packages/server/src/routes/admin-content.ts
rm packages/server/src/routes/admin-users.ts
rm packages/server/src/routes/admin-dashboard.ts
rm packages/server/src/routes/admin-media.ts
rm packages/server/src/routes/admin-forms.ts
rm packages/server/src/routes/admin-collections.ts
rm packages/server/src/routes/admin-plugins.ts
rm packages/server/src/routes/admin-logs.ts
rm packages/server/src/routes/admin-settings.ts
rm packages/server/src/routes/admin-api-reference.ts
rm packages/server/src/routes/admin-code-examples.ts
rm packages/server/src/routes/admin-testimonials.ts
rm packages/server/src/routes/admin-design.ts
rm packages/server/src/routes/admin-checkboxes.ts
rm packages/server/src/routes/admin-collections-field-types.ts
rm packages/server/src/routes/admin-content-field-types.ts
```

- [ ] **Step 4: Run type-check to confirm no remaining references**

```bash
pnpm type-check 2>&1 | head -30
```

Expected: no errors. If errors mention missing imports from deleted files, trace them and remove any remaining references.

- [ ] **Step 5: Run tests**

```bash
pnpm --filter server test 2>&1 | tail -10
```

Expected: all tests pass. If tests in `admin-settings.test.ts` or `admin-spa.test.ts` import from deleted files, they will fail — fix those imports or delete the test file if it only tested the deleted route.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/routes/index.ts packages/server/src/app.ts
git commit -m "feat: remove legacy HTML route mounts (phase 7)"
```

---

## Task 10: Delete legacy templates from admin package

**Files:**
- Delete: `packages/admin/src/templates/` (entire directory)
- Modify: `packages/admin/src/index.ts`

- [ ] **Step 1: Remove the template export from admin index.ts**

In `packages/admin/src/index.ts`, remove or comment out:
```typescript
export * from './templates'
```

If the file becomes empty after this, it can either be left empty (`export {}`) or removed — check if anything imports from `@worker-blog/admin` first:

```bash
grep -r "from '@worker-blog/admin'" packages/server/src/ --include="*.ts" | head -20
```

If server imports from `@worker-blog/admin`, inspect what it imports. If it only imported templates, the import is now stale and should be removed from those server files too.

- [ ] **Step 2: Delete the templates directory**

```bash
rm -rf packages/admin/src/templates/
```

- [ ] **Step 3: Type-check**

```bash
pnpm type-check 2>&1 | head -20
```

Fix any remaining errors (stale imports in server routes that reference template functions).

- [ ] **Step 4: Run full test suite**

```bash
pnpm --filter server test 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: remove legacy admin templates (phase 7)"
```

---

## Task 11: Mark Phase 7 complete in task plan

**Files:**
- Modify: `docs/react-migration/task_plan.md`

- [ ] **Step 1: Update task_plan.md**

Update the Current Scope line to:
```
Phase 4 complete. Phase 5 complete (content, media, forms). Phase 6 complete (collections). Phase 7 complete (remove legacy templates). All planned phases complete.
```

Add a Phase 7 section after Phase 6:

```markdown
### Phase 7: Remove Legacy Templates

- [x] Add shared types: UserProfileResponse, UpdateProfileRequest, ChangePasswordRequest, MutateProfileResponse, ActivityLogItem, ActivityLogsListResponse.
- [x] Add server route adminApiProfileRoutes (GET/PUT /profile, POST /profile/password, POST /profile/avatar) — auth-only, no admin role required.
- [x] Add activity-log endpoints to adminApiUsersRoutes (GET/GET-export /activity-logs).
- [x] Mount /admin/api/profile before adminApiRoutes in app.ts.
- [x] Add React Query hooks: useProfile, useUpdateProfile, useChangePassword, useUploadAvatar, useActivityLogs, activityLogsExportUrl.
- [x] Add React pages: ProfilePage, ActivityLogsPage.
- [x] Wire /admin/profile and /admin/activity-logs into SPA router; add nav items.
- [x] Remove all legacy HTML route exports from routes/index.ts and mounts from app.ts.
- [x] Delete 16 legacy admin-*.ts route files.
- [x] Delete packages/admin/src/templates/ directory.
- [x] Remove export * from './templates' from packages/admin/src/index.ts.
```

- [ ] **Step 2: Commit**

```bash
git add docs/react-migration/task_plan.md
git commit -m "docs: mark Phase 7 complete"
```

---

## Self-Review

**Spec coverage:**
- ✅ All legacy HTML routes removed — Tasks 9, 10
- ✅ `/admin/profile` SPA page with info edit, password change, avatar upload — Tasks 2, 5, 6, 8
- ✅ `/admin/activity-logs` SPA page with filters, pagination, CSV export — Tasks 2, 5, 7, 8
- ✅ Profile route accessible by any auth user (not admin-only) — separate `adminApiProfileRoutes` — Task 2
- ✅ Templates directory deleted — Task 10
- ✅ Admin package no longer exports templates — Task 10
- ✅ SPA catch-all handles all `/admin/*` after legacy routes removed — Task 9
- ✅ Tests for new endpoints — Task 3
- ✅ Phase 7 documented — Task 11

**Placeholder scan:** No TBDs or TODOs found.

**Type consistency:**
- `UserProfileResponse` defined in Task 1, used in `adminApiProfileRoutes` (Task 2) and `useProfile` hook (Task 5) ✅
- `UpdateProfileRequest` / `ChangePasswordRequest` defined in Task 1, used in `updateProfileSchema` / `changePasswordSchema` in Task 2 route and hooks in Task 5 ✅
- `ActivityLogItem` / `ActivityLogsListResponse` defined in Task 1, used in Task 2 route and Task 5 hooks ✅
- `activityLogsExportUrl` exported from `profile.ts` (Task 5), imported in `activity-logs.tsx` (Task 7) ✅
- `ActivityLogsFilters` interface exported from `profile.ts` (Task 5), imported in `activity-logs.tsx` (Task 7) ✅
