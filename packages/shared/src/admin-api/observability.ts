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
