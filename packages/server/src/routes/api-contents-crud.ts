import { Hono } from 'hono'
import type { PublicContentDetail } from '@worker-blog/shared/public-api'
import type { Bindings, Variables } from '../app'

const apiContentsCrudRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/contents/check-slug - Check if slug is available.
// Query params: slug, excludeId (optional - when editing)
// NOTE: This MUST come before /:id route to avoid route conflict
apiContentsCrudRoutes.get('/check-slug', async (c) => {
  try {
    const db = c.env.DB
    const slug = c.req.query('slug')
    const excludeId = c.req.query('excludeId') // When editing, exclude current item
    
    if (!slug) {
      return c.json({ error: 'slug is required' }, 400)
    }
    
    let query = 'SELECT id FROM contents WHERE slug = ? AND deleted_at IS NULL'
    const params: string[] = [slug]
    
    if (excludeId) {
      query += ' AND id != ?'
      params.push(excludeId)
    }
    
    const existing = await db.prepare(query).bind(...params).first()
    
    if (existing) {
      return c.json({ 
        available: false, 
        message: 'This URL slug is already in use' 
      })
    }
    
    return c.json({ available: true })
  } catch (error: unknown) {
    console.error('Error checking slug:', error)
    return c.json({ 
      error: 'Failed to check slug availability',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

apiContentsCrudRoutes.get('/slug/:slug', async (c) => {
  try {
    const slug = c.req.param('slug')
    if (!slug) return c.json({ error: 'Content slug is required' }, 400)

    const content = await c.env.DB
      .prepare("SELECT * FROM contents WHERE slug = ? AND status = 'published' AND deleted_at IS NULL")
      .bind(slug)
      .first()

    if (!content) return c.json({ error: 'Content not found' }, 404)

    return c.json({ data: mapPublicContentDetail(content) })
  } catch (error) {
    console.error('Error fetching content by slug:', error)
    return c.json({
      error: 'Failed to fetch content',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// GET /api/contents/:id - Get single published content item by ID
apiContentsCrudRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    if (!id) return c.json({ error: 'Content id is required' }, 400)
    const db = c.env.DB

    const stmt = db.prepare("SELECT * FROM contents WHERE id = ? AND status = 'published' AND deleted_at IS NULL")
    const content = await stmt.bind(id).first()

    if (!content) {
      return c.json({ error: 'Content not found' }, 404)
    }

    return c.json({ data: mapPublicContentDetail(content) })
  } catch (error) {
    console.error('Error fetching content:', error)
    return c.json({
      error: 'Failed to fetch content',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

function mapPublicContentDetail(content: any): PublicContentDetail {
  return {
    id: content.id,
    title: content.title,
    slug: content.slug,
    excerpt: content.excerpt ?? null,
    bodyHtml: content.body_html ?? '',
    status: content.status,
    cover_image_id: content.cover_image_id ?? null,
    metadata: parseJsonObject(content.metadata),
    published_at: content.published_at,
    created_at: content.created_at,
    updated_at: content.updated_at
  }
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object') return value as Record<string, unknown>
  if (!value) return {}
  try {
    const parsed = JSON.parse(String(value))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export default apiContentsCrudRoutes
