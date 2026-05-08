export type AdminPluginStatus = 'active' | 'inactive' | 'error' | 'uninstalled'

export interface PluginListItem {
  id: string
  name: string
  displayName: string
  description: string | null
  version: string
  author: string
  status: AdminPluginStatus
  category: string
  icon: string | null
  lastUpdated: string
  isCore: boolean
  dependencies: string[]
  permissions: string[]
  errorMessage: string | null
}

export interface PluginsStats {
  total: number
  active: number
  inactive: number
  error: number
  uninstalled: number
}

export interface PluginsListResponse {
  plugins: PluginListItem[]
  stats: PluginsStats
}
