export interface AdminApiSuccessResponse<T> {
  success: true
  data: T
  message?: string
}

export interface AdminApiErrorResponse {
  success: false
  error: string
  message?: string
}

export type AdminApiResponse<T> = AdminApiSuccessResponse<T> | AdminApiErrorResponse

export interface PluginCollectionInfo {
  id: string
  name: string
  display_name: string
  description?: string
  item_count?: number
  is_indexed: boolean
  is_dismissed: boolean
  is_new?: boolean
}

export interface AISearchSettingsData {
  id?: number
  enabled: boolean
  ai_mode_enabled: boolean
  selected_collections: string[]
  dismissed_collections: string[]
  autocomplete_enabled: boolean
  cache_duration: number
  results_limit: number
  index_media: boolean
  last_indexed_at?: number
  created_at?: number
  updated_at?: number
}

export interface AISearchIndexStatusData {
  collection_id: string
  collection_name: string
  total_items: number
  indexed_items: number
  last_sync_at?: number
  status: 'pending' | 'indexing' | 'completed' | 'error'
  error_message?: string
}

export interface AISearchNewCollectionNotification {
  collection: PluginCollectionInfo
  message: string
}

export interface AISearchAnalyticsData {
  total_queries: number
  ai_queries: number
  keyword_queries: number
  popular_queries: Array<{ query: string; count: number }>
  average_query_time: number
}

export interface AISearchAdminDashboardData {
  settings: AISearchSettingsData
  collections: PluginCollectionInfo[]
  newCollections: AISearchNewCollectionNotification[]
  indexStatus: Record<string, AISearchIndexStatusData>
  analytics: AISearchAnalyticsData
}

export type UpdateAISearchSettingsRequest = Partial<Pick<
  AISearchSettingsData,
  | 'enabled'
  | 'ai_mode_enabled'
  | 'selected_collections'
  | 'dismissed_collections'
  | 'autocomplete_enabled'
  | 'cache_duration'
  | 'results_limit'
  | 'index_media'
>>

export interface TriggerAISearchIndexRequest {
  collection_id: string
}

export interface TriggerAISearchIndexResponse {
  message: string
}

export type StripeSubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'trialing'
  | 'unpaid'
  | 'paused'
  | 'incomplete'
  | 'incomplete_expired'

export interface StripeSubscriptionData {
  id: string
  userId: string
  userEmail?: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  stripePriceId: string
  status: StripeSubscriptionStatus
  currentPeriodStart: number
  currentPeriodEnd: number
  cancelAtPeriodEnd: boolean
  createdAt: number
  updatedAt: number
}

export interface StripeSubscriptionStatsData {
  total: number
  active: number
  canceled: number
  pastDue: number
  trialing: number
}

export interface StripeEventRecordData {
  id: string
  stripeEventId: string
  type: string
  objectId: string
  objectType: string
  data: string
  processedAt: number
  status: 'processed' | 'failed' | 'ignored'
  error?: string
}

export interface StripeEventStatsData {
  total: number
  processed: number
  failed: number
  ignored: number
}

export interface StripeAdminDashboardData {
  subscriptions: StripeSubscriptionData[]
  subscriptionTotal: number
  subscriptionStats: StripeSubscriptionStatsData
  events: StripeEventRecordData[]
  eventTotal: number
  eventStats: StripeEventStatsData
  eventTypes: string[]
  configured: boolean
}

export interface StripeSyncResponse {
  total: number
  synced: number
  errors: number
}

export type SecurityAuditEventType =
  | 'login_success'
  | 'login_failure'
  | 'registration'
  | 'password_reset_request'
  | 'password_reset_complete'
  | 'account_lockout'
  | 'suspicious_activity'
  | 'logout'
  | 'permission_denied'

export type SecurityAuditSeverity = 'info' | 'warning' | 'critical'

export interface SecurityAuditEventData {
  id: string
  eventType: SecurityAuditEventType
  severity: SecurityAuditSeverity
  userId?: string | null
  email?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  countryCode?: string | null
  requestPath?: string | null
  requestMethod?: string | null
  details?: Record<string, unknown> | null
  fingerprint?: string | null
  blocked: boolean
  createdAt: number
}

export interface SecurityAuditStatsData {
  totalEvents: number
  failedLogins24h: number
  failedLoginsTrend: number
  activeLockouts: number
  flaggedIPs: number
  eventsByType: Record<string, number>
  eventsBySeverity: Record<string, number>
}

export interface SecurityAuditTopIPData {
  ipAddress: string
  countryCode: string | null
  failedAttempts: number
  lastSeen: number
  locked: boolean
}

export interface SecurityAuditHourlyBucketData {
  hour: string
  count: number
}

export interface SecurityAuditLockoutData {
  key: string
  type: 'ip' | 'email'
  value: string
  lockedAt: number
}

export interface SecurityAuditSettingsData {
  retention: {
    daysToKeep: number
    maxEvents: number
    autoPurge: boolean
  }
  bruteForce: {
    enabled: boolean
    maxFailedAttemptsPerIP: number
    maxFailedAttemptsPerEmail: number
    windowMinutes: number
    lockoutDurationMinutes: number
    alertThreshold: number
  }
  logging: {
    logSuccessfulLogins: boolean
    logLogouts: boolean
    logRegistrations: boolean
    logPasswordResets: boolean
    logPermissionDenied: boolean
  }
}

export interface SecurityAuditAdminDashboardData {
  stats: SecurityAuditStatsData
  topIPs: SecurityAuditTopIPData[]
  hourlyTrend: SecurityAuditHourlyBucketData[]
  recentCritical: SecurityAuditEventData[]
  events: SecurityAuditEventData[]
  eventTotal: number
  lockouts: SecurityAuditLockoutData[]
  settings: SecurityAuditSettingsData
}

export interface SecurityAuditPurgeResponse {
  deleted: number
}

export interface AnalyticsSystemStatsData {
  totalRequests: number
  uniqueIPs: number
  avgDuration: number
  errorCount: number
}

export interface AnalyticsTopPageData {
  path: string
  views: number
}

export interface AnalyticsRecentActivityData {
  url: string
  method: string
  status_code: number
  duration: number
  created_at: number
}

export interface AnalyticsEventStatsData {
  totalEvents: number
  uniqueUsers: number
  uniqueSessions: number
  topEvents: Array<{ event: string; count: number }>
}

export interface AnalyticsEventData {
  id: string
  event: string
  category: string
  properties?: Record<string, unknown> | null
  user_id?: string | null
  session_id?: string | null
  ip_address?: string | null
  user_agent?: string | null
  path?: string | null
  created_at: number
}

export interface AnalyticsAdminDashboardData {
  systemStats: AnalyticsSystemStatsData
  topPages: AnalyticsTopPageData[]
  recentActivity: AnalyticsRecentActivityData[]
  eventStats: AnalyticsEventStatsData
  events: AnalyticsEventData[]
  eventTotal: number
}

export interface WorkflowStateData {
  id: string
  name: string
  description?: string
  color: string
  is_initial: boolean
  is_final: boolean
  count: number
  content: Array<Record<string, unknown>>
}

export interface WorkflowScheduledStatsData {
  pending: number
  completed: number
  failed: number
  cancelled: number
}

export interface WorkflowAdminDashboardData {
  states: WorkflowStateData[]
  assignedContent: Array<Record<string, unknown>>
  scheduledContent: Array<Record<string, unknown>>
  scheduledStats: WorkflowScheduledStatsData
}

export interface UserProfileFieldDefinitionData {
  name: string
  label: string
  type: string
  options?: string[]
  default?: unknown
  required?: boolean
  placeholder?: string
  helpText?: string
  hidden?: boolean
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}

export interface UserProfileSchemaData {
  fields: UserProfileFieldDefinitionData[]
  registrationFields: string[]
}

export interface UserProfileCustomDataResponse {
  userId: string
  customData: Record<string, unknown>
}

export interface UpdateUserProfileCustomDataRequest {
  customData: Record<string, unknown>
}
