import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware'
import {
  createFormSchema,
  updateFormSchema,
  type FormsListResponse,
  type FormDetailResponse,
  type MutateFormResponse,
} from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../app'

export const adminApiFormsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminApiFormsRoutes.use('*', requireAuth())
adminApiFormsRoutes.use('*', requireRole(['admin', 'editor']))

function defaultSettings() {
  return {
    emailNotifications: false,
    notifyEmail: null,
    successMessage: 'Thank you for your submission!',
    redirectUrl: null,
    allowAnonymous: true,
    requireAuth: false,
    maxSubmissions: null,
    submitButtonText: 'Submit',
  }
}

adminApiFormsRoutes.get('/', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)

  const db = c.env.DB
  const search = c.req.query('search') || ''
  const category = c.req.query('category') || ''

  const conditions: string[] = []
  const params: unknown[] = []

  if (search) {
    conditions.push('(name LIKE ? OR display_name LIKE ?)')
    params.push(`%${search}%`, `%${search}%`)
  }
  if (category) {
    conditions.push('category = ?')
    params.push(category)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
    const countRes = await db
      .prepare(`SELECT COUNT(*) as count FROM forms ${where}`)
      .bind(...params)
      .first() as any
    const total = countRes?.count || 0

    const { results } = await db
      .prepare(`SELECT id, name, display_name, description, category, is_active, is_public, submission_count, created_at, updated_at FROM forms ${where} ORDER BY created_at DESC`)
      .bind(...params)
      .all()

    const forms = (results || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      displayName: r.display_name,
      description: r.description ?? null,
      category: r.category || 'general',
      isActive: Boolean(r.is_active),
      isPublic: Boolean(r.is_public),
      submissionCount: r.submission_count || 0,
      createdAt: new Date(Number(r.created_at)).toISOString(),
      updatedAt: new Date(Number(r.updated_at)).toISOString(),
    }))

    const response: FormsListResponse = { forms, total }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-forms] Error fetching forms:', error)
    return c.json({ error: 'Failed to fetch forms' }, 500)
  }
})

adminApiFormsRoutes.get('/:id', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)
  const id = c.req.param('id')
  const db = c.env.DB

  try {
    const row = await db
      .prepare('SELECT * FROM forms WHERE id = ?')
      .bind(id)
      .first() as any

    if (!row) return c.json({ error: 'Form not found' }, 404)

    let settings = defaultSettings()
    if (row.settings) {
      try { settings = { ...settings, ...JSON.parse(row.settings) } } catch { /* ignore */ }
    }

    const response: FormDetailResponse = {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description ?? null,
      category: row.category || 'general',
      formioSchema: row.formio_schema ? JSON.parse(row.formio_schema) : { components: [] },
      settings,
      isActive: Boolean(row.is_active),
      isPublic: Boolean(row.is_public),
      submissionCount: row.submission_count || 0,
      createdAt: new Date(Number(row.created_at)).toISOString(),
      updatedAt: new Date(Number(row.updated_at)).toISOString(),
    }
    return c.json(response)
  } catch (error) {
    console.error('[admin-api-forms] Error fetching form:', error)
    return c.json({ error: 'Failed to fetch form' }, 500)
  }
})

adminApiFormsRoutes.post('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Authentication required' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

  const parsed = createFormSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 422)

  const db = c.env.DB

  try {
    const existing = await db
      .prepare('SELECT id FROM forms WHERE name = ?')
      .bind(parsed.data.name)
      .first()
    if (existing) return c.json({ error: 'A form with this name already exists' }, 409)

    const id = crypto.randomUUID()
    const now = Date.now()

    await db
      .prepare('INSERT INTO forms (id, name, display_name, description, category, formio_schema, settings, is_active, is_public, submission_count, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 0, ?, ?, ?, ?)')
      .bind(
        id,
        parsed.data.name,
        parsed.data.displayName,
        parsed.data.description ?? null,
        parsed.data.category,
        JSON.stringify(parsed.data.formioSchema ?? { components: [] }),
        JSON.stringify(defaultSettings()),
        parsed.data.isPublic ? 1 : 0,
        user.userId,
        user.userId,
        now,
        now,
      )
      .run()

    const response: MutateFormResponse = { message: 'Form created successfully', id }
    return c.json(response, 201)
  } catch (error) {
    console.error('[admin-api-forms] Error creating form:', error)
    return c.json({ error: 'Failed to create form' }, 500)
  }
})

adminApiFormsRoutes.put('/:id', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Authentication required' }, 401)
  const id = c.req.param('id')

  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

  const parsed = updateFormSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 422)

  const db = c.env.DB

  try {
    const existing = await db.prepare('SELECT * FROM forms WHERE id = ?').bind(id).first() as any
    if (!existing) return c.json({ error: 'Form not found' }, 404)

    const fields: string[] = []
    const vals: unknown[] = []

    if (parsed.data.displayName !== undefined) { fields.push('display_name = ?'); vals.push(parsed.data.displayName) }
    if (parsed.data.description !== undefined) { fields.push('description = ?'); vals.push(parsed.data.description) }
    if (parsed.data.category !== undefined) { fields.push('category = ?'); vals.push(parsed.data.category) }
    if (parsed.data.isActive !== undefined) { fields.push('is_active = ?'); vals.push(parsed.data.isActive ? 1 : 0) }
    if (parsed.data.isPublic !== undefined) { fields.push('is_public = ?'); vals.push(parsed.data.isPublic ? 1 : 0) }
    if (parsed.data.formioSchema !== undefined) { fields.push('formio_schema = ?'); vals.push(JSON.stringify(parsed.data.formioSchema)) }
    if (parsed.data.settings !== undefined) {
      let currentSettings = defaultSettings()
      if (existing.settings) {
        try { currentSettings = { ...currentSettings, ...JSON.parse(existing.settings) } } catch { /* ignore */ }
      }
      fields.push('settings = ?')
      vals.push(JSON.stringify({ ...currentSettings, ...parsed.data.settings }))
    }

    if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400)

    fields.push('updated_by = ?', 'updated_at = ?')
    vals.push(user.userId, Date.now(), id)

    await db.prepare(`UPDATE forms SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run()

    return c.json({ message: 'Form updated successfully' })
  } catch (error) {
    console.error('[admin-api-forms] Error updating form:', error)
    return c.json({ error: 'Failed to update form' }, 500)
  }
})

adminApiFormsRoutes.delete('/:id', async (c) => {
  if (!c.get('user')) return c.json({ error: 'Authentication required' }, 401)
  const id = c.req.param('id')
  const db = c.env.DB

  try {
    const existing = await db.prepare('SELECT id, managed FROM forms WHERE id = ?').bind(id).first() as any
    if (!existing) return c.json({ error: 'Form not found' }, 404)
    if (existing.managed) return c.json({ error: 'Cannot delete a managed form' }, 400)

    await db.prepare('DELETE FROM forms WHERE id = ?').bind(id).run()

    return c.json({ message: 'Form deleted successfully' })
  } catch (error) {
    console.error('[admin-api-forms] Error deleting form:', error)
    return c.json({ error: 'Failed to delete form' }, 500)
  }
})
