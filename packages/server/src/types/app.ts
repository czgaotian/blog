import type { D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types'
import type { Context, Hono } from 'hono'

export interface Bindings {
  DB: D1Database
  CACHE_KV: KVNamespace
  MEDIA_BUCKET: R2Bucket
  ASSETS: Fetcher
  IMAGES_ACCOUNT_ID?: string
  IMAGES_API_TOKEN?: string
  ENVIRONMENT?: string
  CORS_ORIGINS?: string
  BOOTSTRAP_MODE?: string
  REQUEST_LOGGING_ENABLED?: string
  JWT_SECRET?: string
  JWT_EXPIRES_IN?: string
  JWT_REFRESH_GRACE_SECONDS?: string
  BUCKET_NAME?: string
}

export interface Variables {
  user?: {
    userId: string
    email: string
    role: string
    exp: number
    iat: number
  }
  requestId?: string
  startTime?: number
  appName?: string
  appVersion?: string
  csrfToken?: string
}

export interface WorkerBlogConfig {
  // Custom routes
  routes?: Array<{
    path: string
    handler: Hono
  }>

  // Custom middleware
  middleware?: {
    beforeAuth?: Array<(c: Context, next: () => Promise<void>) => Promise<void>>
    afterAuth?: Array<(c: Context, next: () => Promise<void>) => Promise<void>>
  }

  // Admin access control
  // Roles allowed to access the /admin panel. Defaults to ['admin'].
  adminAccessRoles?: string[]

  // App metadata
  version?: string
  name?: string
}

export type WorkerBlogApp = Hono<{ Bindings: Bindings; Variables: Variables }>
