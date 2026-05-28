/**
 * Services Module Exports
 *
 * Core business logic services for Worker Blog
 */

// Database Migrations
export { MigrationService } from './migrations'
export type { Migration, MigrationStatus } from './migrations'

// Logging
export { Logger, getLogger, initLogger } from './logger'
export type { LogLevel, LogCategory, LogEntry, LogFilter } from './logger'

// Cache Service
export { CacheService, getCacheService, CACHE_CONFIGS } from './cache'
export type { CacheConfig } from './cache'

// Settings Service
export { SettingsService } from './settings'
export type { Setting, GeneralSettings } from './settings'

// Telemetry Service
export {
  TelemetryService,
  getTelemetryService,
  initTelemetry,
  createInstallationIdentity
} from './telemetry-service'

// Route Metadata (auto-discovery for API reference)
export {
  buildRouteList,
  setAppInstance,
  getAppInstance,
  CATEGORY_INFO
} from './route-metadata'
export type { RouteMetadata } from './route-metadata'
