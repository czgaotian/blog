import { Hono } from 'hono'
import { requireAuth, requireRole } from '../middleware'
import { getLogger } from '../services'
import type { LogLevel, LogCategory, LogFilter } from '../services'
import type { LogsListResponse, LogDetailsResponse, LogConfigResponse, LogEntryResponse } from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../app'

export const adminApiLogsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminApiLogsRoutes.use('*', requireAuth())
adminApiLogsRoutes.use('*', requireRole(['admin', 'editor']))

function safeJson(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw ?? null
  try { return JSON.parse(raw) } catch { return null }
}

function safeTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[]
  if (typeof raw !== 'string') return []
  try { return JSON.parse(raw) } catch { return [] }
}

function toLogEntryResponse(log: any): LogEntryResponse {
  return {
    id: log.id,
    level: log.level,
    category: log.category,
    message: log.message,
    source: log.source ?? null,
    userId: log.userId ?? null,
    ipAddress: log.ipAddress ?? null,
    method: log.method ?? null,
    url: log.url ?? null,
    statusCode: log.statusCode ?? null,
    duration: log.duration ?? null,
    stackTrace: log.stackTrace ?? null,
    data: safeJson(log.data),
    tags: safeTags(log.tags),
    createdAt: new Date(log.createdAt).toISOString(),
  }
}

// /config MUST come before /:id
adminApiLogsRoutes.get('/config', async (c) => {
  const logger = getLogger(c.env?.DB)
  const configs = await logger.getAllConfigs()
  const response: LogConfigResponse = {
    configs: configs.map(cfg => ({
      id: cfg.id,
      category: cfg.category,
      enabled: cfg.enabled,
      level: cfg.level,
      retention: cfg.retention,
      maxSize: cfg.maxSize ?? null,
    })),
  }
  return c.json(response)
})

adminApiLogsRoutes.get('/', async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }
  const query = c.req.query()
  const rawPage = parseInt(query.page || '1')
  const rawLimit = parseInt(query.limit || '50')
  if (isNaN(rawPage) || isNaN(rawLimit)) {
    return c.json({ error: 'page and limit must be integers' }, 400)
  }
  const page = Math.max(1, rawPage)
  const limit = Math.min(100, Math.max(1, rawLimit))
  if (query.start_date && isNaN(new Date(query.start_date).getTime())) {
    return c.json({ error: 'Invalid start_date' }, 400)
  }
  if (query.end_date && isNaN(new Date(query.end_date).getTime())) {
    return c.json({ error: 'Invalid end_date' }, 400)
  }
  const logger = getLogger(c.env?.DB)

  const filter: LogFilter = {
    limit,
    offset: (page - 1) * limit,
    sortBy: 'created_at',
    sortOrder: 'desc',
  }
  if (query.level) filter.level = query.level.split(',') as LogLevel[]
  if (query.category) filter.category = query.category.split(',') as LogCategory[]
  if (query.search) filter.search = query.search
  if (query.source) filter.source = query.source
  if (query.start_date) filter.startDate = new Date(query.start_date)
  if (query.end_date) filter.endDate = new Date(query.end_date)

  const { logs, total } = await logger.getLogs(filter)
  const totalPages = Math.ceil(total / limit)

  const response: LogsListResponse = {
    logs: logs.map(toLogEntryResponse),
    pagination: { currentPage: page, totalPages, totalItems: total, itemsPerPage: limit },
    filters: {
      level: query.level || '',
      category: query.category || '',
      search: query.search || '',
      startDate: query.start_date || '',
      endDate: query.end_date || '',
      source: query.source || '',
    },
  }
  return c.json(response)
})

adminApiLogsRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const logger = getLogger(c.env?.DB)
  const { logs } = await logger.getLogs({ limit: 50, offset: 0 })
  const log = logs.find((l: any) => l.id === id)
  if (!log) return c.json({ error: 'Log not found' }, 404)
  const response: LogDetailsResponse = { log: toLogEntryResponse(log) }
  return c.json(response)
})
