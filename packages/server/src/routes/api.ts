import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { schemaDefinitions } from '@worker-blog/shared/schemas'
import { getCacheService, CACHE_CONFIGS } from '../services'
import { QueryFilterBuilder, QueryFilter } from '@worker-blog/shared/utils'
import { optionalAuth } from '../middleware'
import { normalizePublicContentFilter } from './api-content-access-policy'
import apiContentsCrudRoutes from './api-contents-crud'
import type { Bindings, Variables as AppVariables } from '../app'

// Extend Variables with API-specific fields
interface Variables extends AppVariables {
  startTime: number
  cacheEnabled?: boolean
}

const apiRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Add timing middleware
apiRoutes.use('*', async (c, next) => {
  const startTime = Date.now()
  c.set('startTime', startTime)
  await next()
  const totalTime = Date.now() - startTime
  c.header('X-Response-Time', `${totalTime}ms`)
})

apiRoutes.use('*', async (c, next) => {
  c.set('cacheEnabled', true)
  await next()
})

// Add CORS middleware
apiRoutes.use('*', cors({
  origin: (origin, c) => {
    const allowed = (c.env as any)?.CORS_ORIGINS as string | undefined
    if (!allowed) return null // No env var = reject cross-origin (secure default)
    const list = allowed.split(',').map((s: string) => s.trim())
    return list.includes(origin) ? origin : null
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}))

// Helper function to add timing metadata
function addTimingMeta(c: any, meta: any = {}, executionStartTime?: number) {
  const totalTime = Date.now() - c.get('startTime')
  const executionTime = executionStartTime ? Date.now() - executionStartTime : undefined

  return {
    ...meta,
    timing: {
      total: totalTime,
      execution: executionTime,
      unit: 'ms'
    }
  }
}

// Root endpoint - OpenAPI 3.0.0 specification
apiRoutes.get('/', (c) => {
  const baseUrl = new URL(c.req.url)
  const serverUrl = `${baseUrl.protocol}//${baseUrl.host}`

  return c.json({
    openapi: '3.0.0',
    info: {
      title: 'Worker Blog API',
      version: '0.1.0',
      description: 'RESTful API for Worker Blog headless CMS - a modern, AI-powered content management system built on Cloudflare Workers',
      contact: {
        name: 'Worker Blog Support',
        url: `${serverUrl}/docs`,
        email: 'support@worker-blog.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: serverUrl,
        description: 'Current server'
      }
    ],
    paths: {
      '/api/': {
        get: {
          summary: 'API Information',
          description: 'Returns OpenAPI specification for the Worker Blog API',
          operationId: 'getApiInfo',
          tags: ['System'],
          responses: {
            '200': {
              description: 'OpenAPI specification',
              content: {
                'application/json': {
                  schema: { type: 'object' }
                }
              }
            }
          }
        }
      },
      '/api/health': {
        get: {
          summary: 'Health Check',
          description: 'Returns API health status and available schemas',
          operationId: 'getHealth',
          tags: ['System'],
          responses: {
            '200': {
              description: 'Health status',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'healthy' },
                      timestamp: { type: 'string', format: 'date-time' },
                      schemas: { type: 'array', items: { type: 'string' } }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/contents': {
        get: {
          summary: 'List Content',
          description: 'Returns content items with advanced filtering support. Anonymous, viewer, and author requests are restricted to published content; admin and editor requests may query other statuses.',
          operationId: 'getContent',
          tags: ['Content'],
          parameters: [
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 50, maximum: 1000 },
              description: 'Maximum number of items to return'
            },
            {
              name: 'offset',
              in: 'query',
              schema: { type: 'integer', default: 0 },
              description: 'Number of items to skip'
            },
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string', enum: ['draft', 'published', 'archived'] },
              description: 'Filter by content status. Anonymous, viewer, and author requests are limited to published content.'
            }
          ],
          responses: {
            '200': {
              description: 'List of content items',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { type: 'object' } },
                      meta: { type: 'object' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/contents/{id}': {
        get: {
          summary: 'Get Content by ID',
          description: 'Returns a specific content item by ID',
          operationId: 'getContentById',
          tags: ['Content'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Content item ID'
            }
          ],
          responses: {
            '200': { description: 'Content item' },
            '404': { description: 'Content not found' }
          }
        }
      },
      '/api/media': {
        get: {
          summary: 'List Media',
          description: 'Returns all media files with pagination',
          operationId: 'getMedia',
          tags: ['Media'],
          responses: {
            '200': { description: 'List of media files' }
          }
        }
      },
      '/api/media/upload': {
        post: {
          summary: 'Upload Media',
          description: 'Uploads a new media file to R2 storage',
          operationId: 'uploadMedia',
          tags: ['Media'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: { type: 'string', format: 'binary' }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'Media uploaded successfully' },
            '401': { description: 'Unauthorized' }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Content: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            slug: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'published', 'archived'] },
            cover_image_id: { type: ['string', 'null'] },
            published_at: { type: 'integer' },
            created_at: { type: 'integer' },
            updated_at: { type: 'integer' }
          }
        },
        Media: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            filename: { type: 'string' },
            mimetype: { type: 'string' },
            size: { type: 'integer' },
            url: { type: 'string' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'string' }
          }
        }
      }
    },
    tags: [
      { name: 'System', description: 'System and health endpoints' },
      { name: 'Content', description: 'Content management operations' },
      { name: 'Media', description: 'Media file operations' }
    ]
  })
})

// Health check endpoint
apiRoutes.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    schemas: schemaDefinitions.map(s => s.name)
  })
})

apiRoutes.get('/category/:slug', async (c) => getContentsByCategorySlug(c))
apiRoutes.get('/tag/:slug', async (c) => getContentsByTagSlug(c))

// Public contents endpoint with advanced filtering
apiRoutes.get('/contents', optionalAuth(), async (c) => {
  const executionStart = Date.now()

  try {
    const db = c.env.DB
    const queryParams = c.req.query()

    // Parse filter from query parameters
    const filter: QueryFilter = QueryFilterBuilder.parseFromQuery(queryParams)
    const normalizedFilter = normalizePublicContentFilter(filter, c.get('user')?.role)

    // Set default limit if not provided
    if (!normalizedFilter.limit) {
      normalizedFilter.limit = 50
    }
    normalizedFilter.limit = Math.min(normalizedFilter.limit, 1000) // Max 1000

    // Build SQL query from filter
    const builder = new QueryFilterBuilder()
    const queryResult = builder.build('contents', normalizedFilter)

    // Check for query building errors
    if (queryResult.errors.length > 0) {
      return c.json({
        error: 'Invalid filter parameters',
        details: queryResult.errors
      }, 400)
    }

    const cacheEnabled = c.get('cacheEnabled')
    const cache = getCacheService(CACHE_CONFIGS.api!, c.env.CACHE_KV)
    const cacheKey = cache.generateKey('contents-filtered', JSON.stringify({ filter: normalizedFilter, query: queryResult.sql }))

    if (cacheEnabled) {
      const cacheResult = await cache.getWithSource<any>(cacheKey)
      if (cacheResult.hit && cacheResult.data) {
        // Add cache headers
        c.header('X-Cache-Status', 'HIT')
        c.header('X-Cache-Source', cacheResult.source)
        if (cacheResult.ttl) {
          c.header('X-Cache-TTL', Math.floor(cacheResult.ttl).toString())
        }

        // Add cache info and timing to meta
        const dataWithMeta = {
          ...cacheResult.data,
          meta: addTimingMeta(c, {
            ...cacheResult.data.meta,
            cache: {
              hit: true,
              source: cacheResult.source,
              ttl: cacheResult.ttl ? Math.floor(cacheResult.ttl) : undefined
            }
          }, executionStart)
        }

        return c.json(dataWithMeta)
      }
    }

    // Cache miss - fetch from database
    c.header('X-Cache-Status', 'MISS')
    c.header('X-Cache-Source', 'database')

    // Execute query with parameters
    const stmt = db.prepare(queryResult.sql)
    const boundStmt = queryResult.params.length > 0
      ? stmt.bind(...queryResult.params)
      : stmt

    const { results } = await boundStmt.all()

    // Transform results to match API spec (camelCase)
    const transformedResults = results.map((row: any) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt ?? null,
      status: row.status,
      cover_image_id: row.cover_image_id ?? null,
      published_at: row.published_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    }))

    const responseData = {
      data: transformedResults,
      meta: addTimingMeta(c, {
        count: results.length,
        timestamp: new Date().toISOString(),
        filter: normalizedFilter,
        cache: {
          hit: false,
          source: 'database'
        }
      }, executionStart)
    }

    // Cache the response only if cache is enabled
    if (cacheEnabled) {
      await cache.set(cacheKey, responseData)
    }

    return c.json(responseData)
  } catch (error) {
    console.error('Error fetching content:', error)
    return c.json({
      error: 'Failed to fetch content',
      details: error instanceof Error ? error.message : String(error)
    }, 500)
  }
})

// Mount CRUD routes for contents
apiRoutes.route('/contents', apiContentsCrudRoutes)

async function getContentsByCategorySlug(c: any) {
  const category = await c.env.DB
    .prepare('SELECT id, name, slug, description FROM categories WHERE slug = ?')
    .bind(c.req.param('slug'))
    .first() as any
  if (!category) return c.json({ error: 'Category not found' }, 404)

  const { results } = await c.env.DB
    .prepare(`
      SELECT c.*, cat.name AS category_name, cat.slug AS category_slug
      FROM contents c
      JOIN categories cat ON c.category_id = cat.id
      WHERE cat.id = ? AND c.status = 'published' AND c.deleted_at IS NULL
      ORDER BY c.published_at DESC, c.created_at DESC
    `)
    .bind(category.id)
    .all()

  return c.json({
    category,
    data: (results || []).map((row: any) => mapPublicContent(row, [])),
  })
}

async function getContentsByTagSlug(c: any) {
  const tag = await c.env.DB
    .prepare('SELECT id, name, slug, description FROM tags WHERE slug = ?')
    .bind(c.req.param('slug'))
    .first() as any
  if (!tag) return c.json({ error: 'Tag not found' }, 404)

  const { results } = await c.env.DB
    .prepare(`
      SELECT c.*, cat.name AS category_name, cat.slug AS category_slug
      FROM contents c
      JOIN content_tags ct ON c.id = ct.content_id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE ct.tag_id = ? AND c.status = 'published' AND c.deleted_at IS NULL
      ORDER BY c.published_at DESC, c.created_at DESC
    `)
    .bind(tag.id)
    .all()

  return c.json({
    tag,
    data: (results || []).map((row: any) => mapPublicContent(row, [])),
  })
}

async function getContentTags(db: D1Database, contentId: string) {
  const { results } = await db
    .prepare(`
      SELECT t.id, t.name, t.slug
      FROM content_tags ct
      JOIN tags t ON ct.tag_id = t.id
      WHERE ct.content_id = ?
      ORDER BY t.name ASC
    `)
    .bind(contentId)
    .all()
  return (results || []).map((row: any) => ({ id: row.id, name: row.name, slug: row.slug }))
}

function mapPublicContent(row: any, tags: Array<{ id: string; name: string; slug: string }>) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? null,
    status: row.status,
    cover_image_id: row.cover_image_id ?? null,
    category: row.category_id ? {
      id: row.category_id,
      name: row.category_name,
      slug: row.category_slug,
    } : null,
    tags,
    metadata: parseJsonObject(row.metadata),
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
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

export default apiRoutes
