export type AdminPluginStatus = 'active' | 'inactive' | 'error' | 'uninstalled'

export interface PluginListItem {
  id: string
  name: string
  displayName: string
  description: string
  version: string
  author: string
  status: AdminPluginStatus
  category: string
  icon: string
  lastUpdated: string
  isCore: boolean
  dependencies: string[]
  permissions: string[]
}

export interface PluginsStats {
  total: number
  active: number
  inactive: number
  errors: number
  uninstalled: number
}

export interface PluginsListResponse {
  plugins: PluginListItem[]
  stats: PluginsStats
}
