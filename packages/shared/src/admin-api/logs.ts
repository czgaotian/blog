export interface LogEntryResponse {
  id: string
  level: string
  category: string
  message: string
  source: string | null
  userId: string | null
  ipAddress: string | null
  method: string | null
  url: string | null
  statusCode: number | null
  duration: number | null
  stackTrace: string | null
  data: unknown | null
  tags: string[]
  createdAt: string
}

export interface LogPagination {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
}

export interface LogFilters {
  level: string
  category: string
  search: string
  startDate: string
  endDate: string
  source: string
}

export interface LogsListResponse {
  logs: LogEntryResponse[]
  pagination: LogPagination
  filters: LogFilters
}

export interface LogDetailsResponse {
  log: LogEntryResponse
}

export interface LogConfigEntry {
  id: string
  category: string
  enabled: boolean
  level: string
  retention: number
  maxSize: number | null
}

export interface LogConfigResponse {
  configs: LogConfigEntry[]
}
