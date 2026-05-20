import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware'
import type { Bindings, Variables } from '../app'
import { resolveContentVariables } from '../features/global-variables/variable-resolver'
import { createContent, deleteContent, updateContent } from '../services/content-domain'

const apiContentCrudRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /api/content/check-slug - Check if slug is available in collection
// Query params: collectionId, slug, excludeId (optional - when editing)
// NOTE: This MUST come before /:id route to avoid route conflict
apiContentCrudRoutes.get('/check-slug', async (c) => {
  try {
    const db = c.env.DB
    const collectionId = c.req.query('collectionId')
    const slug = c.req.query('slug')
    const excludeId = c.req.query('excludeId') // When editing, exclude current item
    
    if (!collectionId || !slug) {
      return c.json({ error: 'collectionId and slug are required' }, 400)
    }
    
    // Check for existing content with this slug in the collection
    let query = 'SELECT id FROM content WHERE collection_id = ? AND slug = ?'
    const params: string[] = [collectionId, slug]
    
    if (excludeId) {
      query += ' AND id != ?'
      params.push(excludeId)
    }
    
    const existing = await db.prepare(query).bind(...params).first()
    
    if (existing) {
      return c.json({ 
        available: false, 
        message: 'This URL slug is already in use in this collection' 
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

// GET /api/content/:id - Get single content item by ID
apiContentCrudRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    if (!id) return c.json({ error: 'Content id is required' }, 400)
    const db = c.env.DB

    const stmt = db.prepare('SELECT * FROM content WHERE id = ?')
    const content = await stmt.bind(id).first()

    if (!content) {
      return c.json({ error: 'Content not found' }, 404)
    }

    const transformedContent = {
      id: (content as any).id,
      title: (content as any).title,
      slug: (content as any).slug,
      status: (content as any).status,
      collectionId: (content as any).collection_id,
      data: (content as any).data ? JSON.parse((content as any).data) : {},
      created_at: (content as any).created_at,
      updated_at: (content as any).updated_at
    }

    // Resolve {variable_key} tokens in content data
    const resolveVars = c.req.query('resolve_variables') !== 'false'
    if (resolveVars) {
      transformedContent.data = await resolveContentVariables(transformedContent.data, db)
    }

    return c.json({ data: transformedContent })
  } catch (error) {
    console.error('Error fetching content:', error)
    return c.json({
      error: 'Failed to fetch content',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// POST /api/content - Create new content (requires authentication)
apiContentCrudRoutes.post('/', requireAuth(), requireRole(['admin', 'editor', 'author']), async (c) => {
  try {
    const db = c.env.DB
    const user = c.get('user')
    const body = await c.req.json()

    const { collectionId, title, slug, status, data } = body

    // Validate required fields
    if (!collectionId) {
      return c.json({ error: 'collectionId is required' }, 400)
    }

    if (!title) {
      return c.json({ error: 'title is required' }, 400)
    }

    const result = await createContent({
      db,
      mode: 'headless-create',
      input: {
        collectionId,
        title,
        slug,
        status: status || 'draft',
        data: data || {},
      },
      authorId: user?.userId || 'system',
      cacheKv: c.env.CACHE_KV,
    })

    if (result.duplicateSlug) {
      return c.json({ error: 'A content item with this slug already exists in this collection' }, 409)
    }

    // Get the created content
    const getStmt = db.prepare('SELECT * FROM content WHERE id = ?')
    const createdContent = await getStmt.bind(result.id!).first() as any

    return c.json({
      data: {
        id: createdContent.id,
        title: createdContent.title,
        slug: createdContent.slug,
        status: createdContent.status,
        collectionId: createdContent.collection_id,
        data: createdContent.data ? JSON.parse(createdContent.data) : {},
        created_at: createdContent.created_at,
        updated_at: createdContent.updated_at
      }
    }, 201)
  } catch (error) {
    console.error('Error creating content:', error)
    return c.json({
      error: 'Failed to create content',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// PUT /api/content/:id - Update content (requires authentication)
apiContentCrudRoutes.put('/:id', requireAuth(), requireRole(['admin', 'editor', 'author']), async (c) => {
  try {
    const id = c.req.param('id')
    if (!id) return c.json({ error: 'Content id is required' }, 400)
    const db = c.env.DB
    const body = await c.req.json()

    const result = await updateContent({
      db,
      id,
      mode: 'headless-update',
      patch: body,
      authorId: c.get('user')?.userId || 'system',
      cacheKv: c.env.CACHE_KV,
    })
    if (!result.found) return c.json({ error: 'Content not found' }, 404)

    // Get updated content
    const getStmt = db.prepare('SELECT * FROM content WHERE id = ?')
    const updatedContent = await getStmt.bind(id).first() as any

    return c.json({
      data: {
        id: updatedContent.id,
        title: updatedContent.title,
        slug: updatedContent.slug,
        status: updatedContent.status,
        collectionId: updatedContent.collection_id,
        data: updatedContent.data ? JSON.parse(updatedContent.data) : {},
        created_at: updatedContent.created_at,
        updated_at: updatedContent.updated_at
      }
    })
  } catch (error) {
    console.error('Error updating content:', error)
    return c.json({
      error: 'Failed to update content',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// DELETE /api/content/:id - Delete content (requires authentication)
apiContentCrudRoutes.delete('/:id', requireAuth(), requireRole(['admin', 'editor', 'author']), async (c) => {
  try {
    const id = c.req.param('id')
    if (!id) return c.json({ error: 'Content id is required' }, 400)
    const db = c.env.DB

    const result = await deleteContent({
      db,
      id,
      mode: 'headless-hard',
      cacheKv: c.env.CACHE_KV,
    })
    if (!result.found) return c.json({ error: 'Content not found' }, 404)

    return c.json({ success: true })
  } catch (error) {
    console.error('Error deleting content:', error)
    return c.json({
      error: 'Failed to delete content',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

export default apiContentCrudRoutes
