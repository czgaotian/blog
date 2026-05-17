import { Hono } from 'hono'
import type { AdminApiResponse, StripeAdminDashboardData, StripeSyncResponse } from '@worker-blog/shared/admin-api'
import type { Bindings, Variables } from '../../../../app'
import { requireAuth, requireRole } from '../../../../middleware'
import { StripeAPI } from '../services/stripe-api'
import { StripeEventService } from '../services/stripe-event-service'
import { SubscriptionService } from '../services/subscription-service'
import type { StripePluginSettings, SubscriptionStatus } from '../types'
import { DEFAULT_SETTINGS } from '../types'

const stripeAdminApiRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

stripeAdminApiRoutes.use('*', requireAuth())
stripeAdminApiRoutes.use('*', requireRole('admin'))

function success<T>(data: T, message?: string): AdminApiResponse<T> {
  return message ? { success: true, data, message } : { success: true, data }
}

function failure(error: string, message?: string): AdminApiResponse<never> {
  return message ? { success: false, error, message } : { success: false, error }
}

function getSettings(env: Bindings): StripePluginSettings {
  return {
    ...DEFAULT_SETTINGS,
    stripePublishableKey: env.STRIPE_PUBLISHABLE_KEY || '',
    stripeSecretKey: env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
    stripePriceId: env.STRIPE_PRICE_ID || '',
    successUrl: env.STRIPE_SUCCESS_URL || DEFAULT_SETTINGS.successUrl,
    cancelUrl: env.STRIPE_CANCEL_URL || DEFAULT_SETTINGS.cancelUrl,
  }
}

function mapStripeStatus(status: string): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    active: 'active',
    canceled: 'canceled',
    past_due: 'past_due',
    trialing: 'trialing',
    unpaid: 'unpaid',
    paused: 'paused',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete_expired',
  }

  return map[status] || 'incomplete'
}

stripeAdminApiRoutes.get('/', async (c) => {
  try {
    const subscriptionService = new SubscriptionService(c.env.DB)
    const eventService = new StripeEventService(c.env.DB)
    await Promise.all([subscriptionService.ensureTable(), eventService.ensureTable()])

    const page = c.req.query('page') ? parseInt(c.req.query('page')!, 10) : 1
    const eventPage = c.req.query('eventPage') ? parseInt(c.req.query('eventPage')!, 10) : 1
    const status = c.req.query('status') as SubscriptionStatus | undefined
    const eventStatus = c.req.query('eventStatus') as 'processed' | 'failed' | 'ignored' | undefined
    const eventType = c.req.query('eventType') || undefined

    const [
      subscriptions,
      subscriptionStats,
      events,
      eventStats,
      eventTypes,
    ] = await Promise.all([
      subscriptionService.list({ status, page, limit: 50 }),
      subscriptionService.getStats(),
      eventService.list({ type: eventType, status: eventStatus, page: eventPage, limit: 50 }),
      eventService.getStats(),
      eventService.getDistinctTypes(),
    ])

    const settings = getSettings(c.env)

    return c.json(success<StripeAdminDashboardData>({
      subscriptions: subscriptions.subscriptions as any,
      subscriptionTotal: subscriptions.total,
      subscriptionStats,
      events: events.events,
      eventTotal: events.total,
      eventStats,
      eventTypes,
      configured: Boolean(settings.stripeSecretKey && settings.stripeWebhookSecret),
    }))
  } catch (error) {
    console.error('Error fetching Stripe admin dashboard:', error)
    return c.json(failure('Failed to fetch Stripe dashboard'), 500)
  }
})

stripeAdminApiRoutes.post('/sync', async (c) => {
  try {
    const settings = getSettings(c.env)

    if (!settings.stripeSecretKey) {
      return c.json(failure('Stripe secret key not configured'), 400)
    }

    const stripeApi = new StripeAPI(settings.stripeSecretKey)
    const subscriptionService = new SubscriptionService(c.env.DB)
    await subscriptionService.ensureTable()

    const allSubscriptions = await stripeApi.listAllSubscriptions()
    let synced = 0
    let errors = 0

    for (const subscription of allSubscriptions) {
      try {
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id
        const userId =
          subscription.metadata?.worker_blog_user_id ||
          await subscriptionService.getUserIdByStripeCustomer(customerId) ||
          ''

        await subscriptionService.upsert({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items?.data?.[0]?.price?.id || '',
          status: mapStripeStatus(subscription.status),
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        })
        synced++
      } catch (error) {
        console.error(`[Stripe Sync] Failed to upsert subscription ${subscription.id}:`, error)
        errors++
      }
    }

    return c.json(success<StripeSyncResponse>({
      total: allSubscriptions.length,
      synced,
      errors,
    }, 'Stripe subscriptions synced'))
  } catch (error) {
    console.error('Error syncing Stripe subscriptions:', error)
    return c.json(failure(error instanceof Error ? error.message : 'Sync failed'), 500)
  }
})

export default stripeAdminApiRoutes
