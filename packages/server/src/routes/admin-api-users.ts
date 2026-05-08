import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware'
import {
  createUserSchema,
  updateUserSchema,
  type UsersListResponse,
  type UserDetailResponse,
  type ActivityLogItem,
  type ActivityLogsListResponse,
} from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../app'

export const adminApiUsersRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminApiUsersRoutes.use('*', requireAuth())
adminApiUsersRoutes.use('*', requireRole(['admin']))

adminApiUsersRoutes.get('/', async (c) => {
  const db = c.env.DB
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)
  const page = Math.max(1, Number(c.req.query('page') || '1'))
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') || '20')))
  const search = c.req.query('search') || ''
  const offset = (page - 1) * limit

  let rows: any[]
  let total = 0

  try {
    if (search) {
      const param = `%${search}%`
      const countRes = await db
        .prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1 AND (email LIKE ? OR username LIKE ? OR first_name LIKE ? OR last_name LIKE ?)')
        .bind(param, param, param, param)
        .first() as any
      total = countRes?.count || 0

      const res = await db
        .prepare('SELECT id, email, username, first_name, last_name, role, is_active, created_at, last_login_at FROM users WHERE is_active = 1 AND (email LIKE ? OR username LIKE ? OR first_name LIKE ? OR last_name LIKE ?) ORDER BY created_at DESC LIMIT ? OFFSET ?')
        .bind(param, param, param, param, limit, offset)
        .all()
      rows = res.results as any[]
    } else {
      const countRes = await db
        .prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1')
        .first() as any
      total = countRes?.count || 0

      const res = await db
        .prepare('SELECT id, email, username, first_name, last_name, role, is_active, created_at, last_login_at FROM users WHERE is_active = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?')
        .bind(limit, offset)
        .all()
      rows = res.results as any[]
    }
  } catch (error) {
    console.error('[admin-api-users] Error fetching users:', error)
    return c.json({ error: 'Failed to fetch users' }, 500)
  }

  const users = rows.map((r: any) => ({
    id: r.id,
    email: r.email,
    username: r.username ?? null,
    firstName: r.first_name ?? null,
    lastName: r.last_name ?? null,
    role: r.role,
    isActive: Boolean(r.is_active),
    createdAt: r.created_at ? new Date(Number(r.created_at)).toISOString() : '',
    lastLoginAt: r.last_login_at ? new Date(Number(r.last_login_at)).toISOString() : null,
  }))

  const response: UsersListResponse = { users, total, page, limit }
  return c.json(response)
})

// GET /activity-logs — must be registered before GET /:id to avoid route shadowing
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
    if (dateFrom) {
      const ts = new Date(dateFrom).getTime()
      if (isNaN(ts)) return c.json({ error: 'Invalid date_from format. Use YYYY-MM-DD.' }, 400)
      conditions.push('al.created_at >= ?')
      params.push(ts)
    }
    if (dateTo) {
      const ts = new Date(dateTo).getTime()
      if (isNaN(ts)) return c.json({ error: 'Invalid date_to format. Use YYYY-MM-DD.' }, 400)
      conditions.push('al.created_at <= ?')
      params.push(ts + 86400000)
    }
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

// GET /activity-logs/export — must be registered before GET /:id to avoid route shadowing
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
    if (dateFrom) {
      const ts = new Date(dateFrom).getTime()
      if (isNaN(ts)) return c.json({ error: 'Invalid date_from format. Use YYYY-MM-DD.' }, 400)
      conditions.push('al.created_at >= ?')
      params.push(ts)
    }
    if (dateTo) {
      const ts = new Date(dateTo).getTime()
      if (isNaN(ts)) return c.json({ error: 'Invalid date_to format. Use YYYY-MM-DD.' }, 400)
      conditions.push('al.created_at <= ?')
      params.push(ts + 86400000)
    }
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
      fields.map(f => `"${String(f ?? '').replace(/\r?\n/g, ' ').replace(/"/g, '""')}"`).join(',')

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

adminApiUsersRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB

  try {
    const row = await db
      .prepare('SELECT id, email, username, first_name, last_name, phone, bio, avatar_url, timezone, language, role, is_active, two_factor_enabled, created_at, last_login_at FROM users WHERE id = ?')
      .bind(id)
      .first() as any

    if (!row) return c.json({ error: 'User not found' }, 404)

    const response: UserDetailResponse = {
      user: {
        id: row.id,
        email: row.email,
        username: row.username ?? null,
        firstName: row.first_name ?? null,
        lastName: row.last_name ?? null,
        phone: row.phone ?? null,
        bio: row.bio ?? null,
        avatarUrl: row.avatar_url ?? null,
        timezone: row.timezone || 'UTC',
        language: row.language || 'en',
        role: row.role,
        isActive: Boolean(row.is_active),
        twoFactorEnabled: Boolean(row.two_factor_enabled),
        createdAt: row.created_at ? new Date(Number(row.created_at)).toISOString() : '',
        lastLoginAt: row.last_login_at ? new Date(Number(row.last_login_at)).toISOString() : null,
      },
    }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-users] Error fetching user:', error)
    return c.json({ error: 'Failed to fetch user' }, 500)
  }
})

adminApiUsersRoutes.post('/', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 422)
  }

  const { email, password, role, firstName, lastName } = parsed.data
  const db = c.env.DB

  try {
    const existing = await db
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first()
    if (existing) {
      return c.json({ error: 'A user with this email already exists' }, 409)
    }

    const { AuthManager } = await import('../middleware/auth')
    const passwordHash = await AuthManager.hashPassword(password)
    const userId = crypto.randomUUID()
    const now = Date.now()

    await db
      .prepare('INSERT INTO users (id, email, password_hash, role, first_name, last_name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)')
      .bind(userId, email, passwordHash, role, firstName ?? null, lastName ?? null, now, now)
      .run()

    return c.json({ message: 'User created successfully', userId }, 201)
  } catch (error) {
    console.error('[admin-api-users] Error creating user:', error)
    return c.json({ error: 'Failed to create user' }, 500)
  }
})

adminApiUsersRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id')
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 422)
  }

  const db = c.env.DB
  try {
    const existing = await db.prepare('SELECT id FROM users WHERE id = ?').bind(id).first()
    if (!existing) return c.json({ error: 'User not found' }, 404)

    const fields: string[] = []
    const params: unknown[] = []

    if (parsed.data.email !== undefined) { fields.push('email = ?'); params.push(parsed.data.email) }
    if (parsed.data.role !== undefined) { fields.push('role = ?'); params.push(parsed.data.role) }
    if (parsed.data.firstName !== undefined) { fields.push('first_name = ?'); params.push(parsed.data.firstName) }
    if (parsed.data.lastName !== undefined) { fields.push('last_name = ?'); params.push(parsed.data.lastName) }
    if (parsed.data.isActive !== undefined) { fields.push('is_active = ?'); params.push(parsed.data.isActive ? 1 : 0) }

    if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400)

    fields.push('updated_at = ?')
    params.push(Date.now())
    params.push(id)

    await db
      .prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...params)
      .run()

    return c.json({ message: 'User updated successfully' })
  } catch (error) {
    console.error('[admin-api-users] Error updating user:', error)
    return c.json({ error: 'Failed to update user' }, 500)
  }
})

adminApiUsersRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const currentUser = c.get('user')

  if (currentUser?.userId === id) {
    return c.json({ error: 'Cannot delete your own account' }, 400)
  }

  const db = c.env.DB
  try {
    const existing = await db.prepare('SELECT id FROM users WHERE id = ?').bind(id).first()
    if (!existing) return c.json({ error: 'User not found' }, 404)

    await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
    return c.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('[admin-api-users] Error deleting user:', error)
    return c.json({ error: 'Failed to delete user' }, 500)
  }
})
