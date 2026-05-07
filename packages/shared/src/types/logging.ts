export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogConfig {
  id: string
  category: string
  enabled: boolean
  level: LogLevel | string
  retention: number
  maxSize: number | null
  createdAt: Date
  updatedAt: Date
}
