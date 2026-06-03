import { Hono } from 'hono'
import {
  createCategorySchema,
  updateCategorySchema,
  type CategoryDetailResponse,
  type CategoryListResponse,
  type MutateCategoryResponse,
} from '@worker-blog/shared/admin-api'
import { requireAuth, requireRole } from '../middleware'
import type { Bindings, Variables } from '../app'
import { createCategory, deleteCategory, updateCategory } from '../services/category-domain'

export const adminApiCategoriesRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminApiCategoriesRoutes.use('*', requireAuth())
adminApiCategoriesRoutes.use('*', requireRole(['admin', 'editor', 'author']))

adminApiCategoriesRoutes.get('/', async (c) => {
  const db = c.env.DB
  const { results } = await db
    .prepare('SELECT * FROM categories ORDER BY sort_order ASC, name ASC')
    .all()

  const items = (results || []).map(mapCategory)
  const response: CategoryListResponse = { items, total: items.length }
  return c.json(response)
})

adminApiCategoriesRoutes.get('/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(c.req.param('id')).first()
  if (!row) return c.json({ error: 'Category not found' }, 404)
  return c.json(mapCategory(row) satisfies CategoryDetailResponse)
})

adminApiCategoriesRoutes.post('/', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

  const parsed = createCategorySchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 422)

  const result = await createCategory(c.env.DB, parsed.data)
  if (!result.ok) return categoryError(c, result.reason)

  const response: MutateCategoryResponse = { message: 'Category created successfully', id: result.id }
  return c.json(response, 201)
})

adminApiCategoriesRoutes.put('/:id', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

  const parsed = updateCategorySchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 422)

  const result = await updateCategory(c.env.DB, c.req.param('id'), parsed.data)
  if (!result.ok) return categoryError(c, result.reason)

  return c.json({ message: 'Category updated successfully' } satisfies MutateCategoryResponse)
})

adminApiCategoriesRoutes.delete('/:id', async (c) => {
  const result = await deleteCategory(c.env.DB, c.req.param('id'))
  if (!result.ok) return categoryError(c, result.reason)
  return c.json({ message: 'Category deleted successfully' } satisfies MutateCategoryResponse)
})

function mapCategory(row: any): CategoryDetailResponse {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    parentId: row.parent_id ?? null,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: new Date(Number(row.created_at)).toISOString(),
    updatedAt: new Date(Number(row.updated_at)).toISOString(),
  }
}

function categoryError(c: any, reason?: string) {
  if (reason === 'not_found') return c.json({ error: 'Category not found' }, 404)
  if (reason === 'duplicate_slug') return c.json({ error: 'Category slug already exists' }, 409)
  if (reason === 'parent_not_found') return c.json({ error: 'Parent category not found' }, 422)
  if (reason === 'self_parent') return c.json({ error: 'Category cannot be its own parent' }, 422)
  if (reason === 'cycle') return c.json({ error: 'Category parent would create a cycle' }, 422)
  if (reason === 'in_use') return c.json({ error: 'Category is in use' }, 409)
  return c.json({ error: 'Failed to mutate category' }, 500)
}
