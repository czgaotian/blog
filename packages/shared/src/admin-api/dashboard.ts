export interface DashboardStats {
  collections: number
  contentItems: number
  mediaFiles: number
  users: number
  mediaSize: number
  databaseSize: number
}

export interface DashboardActivityItem {
  id: string
  type: string
  action: string
  description: string
  timestamp: string
  user: string
}

export interface DashboardMetrics {
  requestsPerSecond: number
  totalRequests: number
  averageRPS: number
  averageResponseMs: number
  statusClassCounts: Record<string, number>
  timestamp: string
}

export interface DashboardResponse {
  stats: DashboardStats
  recentActivity: DashboardActivityItem[]
  metrics: DashboardMetrics
}
