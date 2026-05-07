export interface ServerEnvBindings {
  ENVIRONMENT?: string
  CORS_ORIGINS?: string
}

export interface ServerEnvConfig {
  environment: string
  corsOrigins: string[]
}

export function getServerEnvConfig(bindings: ServerEnvBindings = {}): ServerEnvConfig {
  return {
    environment: bindings.ENVIRONMENT ?? 'development',
    corsOrigins: (bindings.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  }
}
