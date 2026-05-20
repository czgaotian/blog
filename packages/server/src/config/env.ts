export interface ServerEnvBindings {
  ENVIRONMENT?: string
  CORS_ORIGINS?: string
  REQUEST_LOGGING_ENABLED?: string
}

export interface ServerEnvConfig {
  environment: string
  corsOrigins: string[]
  requestLoggingEnabled: boolean
}

export function getServerEnvConfig(bindings: ServerEnvBindings = {}): ServerEnvConfig {
  return {
    environment: bindings.ENVIRONMENT ?? 'development',
    corsOrigins: (bindings.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    requestLoggingEnabled: parseBoolean(bindings.REQUEST_LOGGING_ENABLED),
  }
}

function parseBoolean(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on'
}
