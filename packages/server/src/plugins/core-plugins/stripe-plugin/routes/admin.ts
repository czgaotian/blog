import { Hono } from 'hono'
import { requireAuth } from '../../../../middleware'
import { SubscriptionService } from '../services/subscription-service'
import { StripeEventService } from '../services/stripe-event-service'
import { renderSubscriptionsPage } from '../components/subscriptions-page'
import { renderEventsPage } from '../components/events-page'
import type { Bindings, Variables } from '../../../../app'
import type { SubscriptionStatus } from '../types'

const adminRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

adminRoutes.use('*', requireAuth())

// Check admin role
adminRoutes.use('*', async (c, next) => {
  const user = c.get('user')
  if (user?.role !== 'admin') {
    return c.text('Access denied', 403)
  }
  return next()
})

// Subscriptions dashboard
adminRoutes.get('/', async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  const subscriptionService = new SubscriptionService(db)
  await subscriptionService.ensureTable()

  const page = parseInt(c.req.query('page') || '1')
  const limit = 50
  const statusFilter = c.req.query('status') as SubscriptionStatus | undefined

  const [{ subscriptions, total }, stats] = await Promise.all([
    subscriptionService.list({ status: statusFilter, page, limit }),
    subscriptionService.getStats()
  ])

  const totalPages = Math.ceil(total / limit)

  const html = renderSubscriptionsPage({
    subscriptions: subscriptions as any,
    stats,
    filters: { status: statusFilter, page, totalPages },
    user: user ? { name: user.email, email: user.email, role: user.role } : undefined,
    version: c.get('appVersion')
  })

  return c.html(html)
})

// Events log page
adminRoutes.get('/events', async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  const eventService = new StripeEventService(db)
  await eventService.ensureTable()

  const page = parseInt(c.req.query('page') || '1')
  const limit = 50
  const typeFilter = c.req.query('type') || undefined
  const statusFilter = c.req.query('status') as 'processed' | 'failed' | 'ignored' | undefined

  const [{ events, total }, stats, types] = await Promise.all([
    eventService.list({ type: typeFilter, status: statusFilter, page, limit }),
    eventService.getStats(),
    eventService.getDistinctTypes()
  ])

  const totalPages = Math.ceil(total / limit)

  const html = renderEventsPage({
    events,
    stats,
    types,
    filters: { type: typeFilter, status: statusFilter, page, totalPages },
    user: user ? { name: user.email, email: user.email, role: user.role } : undefined,
    version: c.get('appVersion')
  })

  return c.html(html)
})

export { adminRoutes as stripeAdminRoutes }
