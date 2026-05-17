import type { Hono } from 'hono'
import { emailFeature } from './email'
import { otpLoginFeature } from './auth/otp-login'
import { oauthProvidersFeature } from './auth/oauth-providers'
import { userProfilesFeature } from './user-profiles'
import { aiSearchFeature } from './ai-search'
import { securityAuditFeature } from './security-audit'
import { stripeFeature } from './stripe'
import { analyticsFeature } from './analytics'
import { workflowFeature } from './workflow'

export type BuiltInFeatureStatus = 'active' | 'compatibility'

export interface BuiltInFeatureRoute {
  path: string
  handler: Hono
  compatibilityAlias?: boolean
}

export interface BuiltInFeatureDescriptor {
  id: string
  displayName: string
  status: BuiltInFeatureStatus
  routes: BuiltInFeatureRoute[]
  requiredBindings?: string[]
}

function withCompatibilityAliases(routes: Array<{ path: string; handler: Hono }>): BuiltInFeatureRoute[] {
  return routes.map((route) => ({
    ...route,
    compatibilityAlias: route.path.startsWith('/api/plugins/'),
  }))
}

export const preCacheBuiltInFeatureRegistry: BuiltInFeatureDescriptor[] = [
  {
    id: 'security-audit',
    displayName: 'Security Audit',
    status: 'active',
    routes: withCompatibilityAliases(securityAuditFeature.routes as any),
    requiredBindings: ['DB', 'CACHE_KV'],
  },
  {
    id: 'ai-search',
    displayName: 'AI Search',
    status: 'active',
    routes: withCompatibilityAliases(aiSearchFeature.routes as any),
    requiredBindings: ['DB'],
  },
]

export const postCacheBuiltInFeatureRegistry: BuiltInFeatureDescriptor[] = [
  {
    id: 'oauth-providers',
    displayName: 'OAuth Providers',
    status: 'active',
    routes: withCompatibilityAliases(oauthProvidersFeature.routes as any),
    requiredBindings: ['DB'],
  },
  {
    id: 'user-profiles',
    displayName: 'User Profiles',
    status: 'active',
    routes: withCompatibilityAliases(userProfilesFeature.routes as any),
    requiredBindings: ['DB'],
  },
  {
    id: 'otp-login',
    displayName: 'OTP Login',
    status: 'active',
    routes: withCompatibilityAliases(otpLoginFeature.routes as any),
    requiredBindings: ['DB'],
  },
  {
    id: 'analytics',
    displayName: 'Analytics',
    status: 'active',
    routes: withCompatibilityAliases(analyticsFeature.routes as any),
    requiredBindings: ['DB'],
  },
  {
    id: 'workflow',
    displayName: 'Workflow',
    status: 'active',
    routes: withCompatibilityAliases(workflowFeature.routes as any),
    requiredBindings: ['DB'],
  },
]

export const postEventsBuiltInFeatureRegistry: BuiltInFeatureDescriptor[] = [
  {
    id: 'stripe',
    displayName: 'Stripe',
    status: 'active',
    routes: withCompatibilityAliases(stripeFeature.routes as any),
    requiredBindings: ['DB'],
  },
]

export const builtInFeatureRegistry: BuiltInFeatureDescriptor[] = [
  ...preCacheBuiltInFeatureRegistry,
  ...postCacheBuiltInFeatureRegistry,
  ...postEventsBuiltInFeatureRegistry,
]

export const lateBuiltInFeatureRegistry: BuiltInFeatureDescriptor[] = [
  {
    id: 'email',
    displayName: 'Email',
    status: 'active',
    routes: withCompatibilityAliases(emailFeature.routes as any),
    requiredBindings: ['DB'],
  },
]
