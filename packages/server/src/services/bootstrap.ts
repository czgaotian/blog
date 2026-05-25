import { syncCollections } from './collection-sync'
import { MigrationService } from './migrations'
import type { WorkerBlogConfig } from '../app'

type BootstrapEnv = {
  DB: D1Database
  CACHE_KV: KVNamespace
  JWT_SECRET?: string
  CORS_ORIGINS?: string
  ENVIRONMENT?: string
  BOOTSTRAP_MODE?: string
}

export type BootstrapMode = 'auto' | 'manual' | 'disabled'

export interface BootstrapRuntimeConfig {
  mode: BootstrapMode
}

export type BootstrapStepName = 'migrations' | 'collections' | 'security'
export type BootstrapStepState = 'pending' | 'success' | 'error'

export interface BootstrapStepStatus {
  name: BootstrapStepName
  state: BootstrapStepState
  durationMs?: number
  error?: string
}

export interface BootstrapStatus {
  complete: boolean
  running: boolean
  lastStartedAt?: string
  lastCompletedAt?: string
  totalDurationMs?: number
  lastError?: string
  steps: BootstrapStepStatus[]
}

const stepNames: BootstrapStepName[] = ['migrations', 'collections', 'security']

let bootstrapComplete = false
let bootstrapRunning = false
let bootstrapStatus: BootstrapStatus = createInitialStatus()

export function getBootstrapRuntimeConfig(env: Pick<BootstrapEnv, 'BOOTSTRAP_MODE'> = {}): BootstrapRuntimeConfig {
  const rawMode = env.BOOTSTRAP_MODE?.trim().toLowerCase()

  if (rawMode === 'manual' || rawMode === 'disabled') {
    return { mode: rawMode }
  }

  return { mode: 'auto' }
}

export function verifySecurityConfig(env: BootstrapEnv): void {
  const warnings: string[] = []

  if (!env.JWT_SECRET) {
    warnings.push(
      "JWT_SECRET is not set — using hardcoded fallback. Set via `wrangler secret put JWT_SECRET`"
    )
  } else if (env.JWT_SECRET.includes("change-in-production")) {
    warnings.push(
      "JWT_SECRET contains the default value — tokens are forgeable. Generate a strong random secret"
    )
  }

  if (!env.CORS_ORIGINS) {
    warnings.push(
      "CORS_ORIGINS is not set — all cross-origin API requests will be rejected"
    )
  }

  if (!env.ENVIRONMENT) {
    warnings.push(
      "ENVIRONMENT is not set — HSTS header will not be applied. Set to \"production\" or \"development\""
    )
  }

  if (warnings.length === 0) {
    return
  }

  const isProduction = env.ENVIRONMENT === "production"

  for (const warning of warnings) {
    console.warn(`[Worker Blog Security] ${warning}`)
  }

  if (isProduction) {
    const hasCritical =
      !env.JWT_SECRET || env.JWT_SECRET.includes("change-in-production")
    if (hasCritical) {
      throw new Error(
        "[Worker Blog Security] CRITICAL: Production deployment is missing a secure JWT_SECRET. " +
          "Set it via `wrangler secret put JWT_SECRET` before deploying."
      )
    }
  }
}

export function isBootstrapComplete(): boolean {
  return bootstrapComplete
}

export function getBootstrapStatus(): BootstrapStatus {
  return {
    ...bootstrapStatus,
    steps: bootstrapStatus.steps.map((step) => ({ ...step })),
  }
}

export async function runBootstrap(env: BootstrapEnv, _config: WorkerBlogConfig = {}): Promise<void> {
  if (bootstrapComplete || bootstrapRunning) {
    return
  }

  bootstrapRunning = true
  const startedAt = new Date()
  bootstrapStatus = {
    complete: false,
    running: true,
    lastStartedAt: startedAt.toISOString(),
    steps: createPendingSteps(),
  }

  try {
    console.log("[Bootstrap] Starting system initialization...")

    console.log("[Bootstrap] Running database migrations...")
    await recordStep('migrations', async () => {
      const migrationService = new MigrationService(env.DB)
      await migrationService.runPendingMigrations()
    })

    console.log("[Bootstrap] Syncing collection configurations...")
    await recordStep('collections', async () => {
      try {
        await syncCollections(env.DB)
      } catch (error) {
        console.error("[Bootstrap] Error syncing collections:", error)
        throw error
      }
    })

    bootstrapComplete = true
    console.log("[Bootstrap] System initialization completed")
  } catch (error) {
    bootstrapStatus.lastError = serializeError(error)
    console.error("[Bootstrap] Error during system initialization:", error)
  }

  try {
    await recordStep('security', async () => verifySecurityConfig(env))
  } finally {
    const completedAt = new Date()
    bootstrapRunning = false
    bootstrapStatus = {
      ...bootstrapStatus,
      complete: bootstrapComplete,
      running: false,
      lastCompletedAt: completedAt.toISOString(),
      totalDurationMs: completedAt.getTime() - startedAt.getTime(),
    }
  }
}

export function resetBootstrap(): void {
  bootstrapComplete = false
  bootstrapRunning = false
  bootstrapStatus = createInitialStatus()
}

async function recordStep(name: BootstrapStepName, action: () => Promise<void> | void): Promise<void> {
  const started = Date.now()
  try {
    await action()
    updateStep({
      name,
      state: 'success',
      durationMs: Date.now() - started,
    })
  } catch (error) {
    updateStep({
      name,
      state: 'error',
      durationMs: Date.now() - started,
      error: serializeError(error),
    })

    if (name === 'collections') {
      return
    }

    throw error
  }
}

function updateStep(step: BootstrapStepStatus): void {
  bootstrapStatus = {
    ...bootstrapStatus,
    steps: bootstrapStatus.steps.map((existing) =>
      existing.name === step.name ? step : existing
    ),
  }
}

function createInitialStatus(): BootstrapStatus {
  return {
    complete: false,
    running: false,
    steps: createPendingSteps(),
  }
}

function createPendingSteps(): BootstrapStepStatus[] {
  return stepNames.map((name) => ({
    name,
    state: 'pending',
  }))
}

function serializeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
