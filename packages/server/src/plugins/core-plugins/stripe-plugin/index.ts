/**
 * Built-in Stripe subscription feature.
 */

import { stripeApiRoutes } from './routes/api'
import stripeAdminApiRoutes from './routes/admin-api'

export const stripeFeature = {
  routes: [
    {
      path: '/api/stripe',
      handler: stripeApiRoutes as any,
    },
    {
      path: '/api/plugins/stripe',
      handler: stripeAdminApiRoutes as any,
    },
  ],
}

export { SubscriptionService } from './services/subscription-service'
export { StripeAPI } from './services/stripe-api'
export { requireSubscription } from './middleware/require-subscription'
