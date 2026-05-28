import { D1Database } from '@cloudflare/workers-types'
import { bundledMigrations, getMigrationSQLById, type BundledMigration } from '../db/migrations-bundle'

export interface Migration {
  id: string
  name: string
  filename: string
  description?: string
  applied: boolean
  appliedAt?: string
  size?: number
}

export interface MigrationStatus {
  totalMigrations: number
  appliedMigrations: number
  pendingMigrations: number
  lastApplied?: string
  migrations: Migration[]
}

export class MigrationService {
  constructor(private db: D1Database) {}

  /**
   * Initialize the migrations tracking table
   */
  async initializeMigrationsTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        filename TEXT NOT NULL,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        checksum TEXT
      )
    `

    await this.db.prepare(createTableQuery).run()
  }

  /**
   * Get all available migrations from the bundled migrations
   */
  async getAvailableMigrations(): Promise<Migration[]> {
    const migrations: Migration[] = []

    // Get applied migrations from database
    const appliedResult = await this.db.prepare(
      'SELECT id, name, filename, applied_at FROM migrations ORDER BY applied_at ASC'
    ).all()

    const appliedMigrations = new Map(
      appliedResult.results?.map((row: any) => [row.id, row]) || []
    )

    // Auto-detect the baseline migration for databases created before the
    // migration tracking table existed.
    await this.autoDetectAppliedMigrations(appliedMigrations)

    // Use bundled migrations as the source of truth
    for (const bundled of bundledMigrations) {
      const applied = appliedMigrations.has(bundled.id)
      const appliedData = appliedMigrations.get(bundled.id)

      migrations.push({
        id: bundled.id,
        name: bundled.name,
        filename: bundled.filename,
        description: bundled.description,
        applied,
        appliedAt: applied ? appliedData?.applied_at : undefined,
        size: bundled.sql.length
      })
    }

    return migrations
  }

  /**
   * Auto-detect applied migrations by checking if their tables exist
   */
  private async autoDetectAppliedMigrations(appliedMigrations: Map<string, any>): Promise<void> {
    // Check if basic schema tables exist (migration 001)
    if (!appliedMigrations.has('001')) {
      const hasBasicTables = await this.checkTablesExist(['users', 'content', 'collections', 'media'])
      if (hasBasicTables) {
        appliedMigrations.set('001', {
          id: '001',
          applied_at: new Date().toISOString(),
          name: 'Initial Schema',
          filename: '001_initial_schema.sql'
        })
        await this.markMigrationApplied('001', 'Initial Schema', '001_initial_schema.sql')
      }
    }

  }

  /**
   * Check if specific tables exist in the database
   */
  private async checkTablesExist(tableNames: string[]): Promise<boolean> {
    try {
      for (const tableName of tableNames) {
        const result = await this.db.prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
        ).bind(tableName).first()

        if (!result) {
          return false
        }
      }
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Get migration status summary
   */
  async getMigrationStatus(): Promise<MigrationStatus> {
    await this.initializeMigrationsTable()

    const migrations = await this.getAvailableMigrations()
    const appliedMigrations = migrations.filter(m => m.applied)
    const pendingMigrations = migrations.filter(m => !m.applied)

    const lastApplied = appliedMigrations.length > 0
      ? appliedMigrations[appliedMigrations.length - 1]?.appliedAt
      : undefined

    return {
      totalMigrations: migrations.length,
      appliedMigrations: appliedMigrations.length,
      pendingMigrations: pendingMigrations.length,
      lastApplied,
      migrations
    }
  }

  /**
   * Mark a migration as applied
   */
  async markMigrationApplied(migrationId: string, name: string, filename: string): Promise<void> {
    await this.initializeMigrationsTable()

    await this.db.prepare(
      'INSERT OR REPLACE INTO migrations (id, name, filename, applied_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)'
    ).bind(migrationId, name, filename).run()
  }

  /**
   * Remove a migration from the applied list (so it can be re-run)
   */
  async removeMigrationApplied(migrationId: string): Promise<void> {
    await this.initializeMigrationsTable()

    await this.db.prepare(
      'DELETE FROM migrations WHERE id = ?'
    ).bind(migrationId).run()
  }

  /**
   * Check if a specific migration has been applied
   */
  async isMigrationApplied(migrationId: string): Promise<boolean> {
    await this.initializeMigrationsTable()

    const result = await this.db.prepare(
      'SELECT COUNT(*) as count FROM migrations WHERE id = ?'
    ).bind(migrationId).first()

    return (result?.count as number) > 0
  }

  /**
   * Get the last applied migration
   */
  async getLastAppliedMigration(): Promise<Migration | null> {
    await this.initializeMigrationsTable()

    const result = await this.db.prepare(
      'SELECT id, name, filename, applied_at FROM migrations ORDER BY applied_at DESC LIMIT 1'
    ).first()

    if (!result) return null

    return {
      id: result.id as string,
      name: result.name as string,
      filename: result.filename as string,
      applied: true,
      appliedAt: result.applied_at as string
    }
  }

  /**
   * Run pending migrations
   */
  async runPendingMigrations(): Promise<{ success: boolean; message: string; applied: string[]; errors: string[] }> {
    await this.initializeMigrationsTable()

    const status = await this.getMigrationStatus()
    const pendingMigrations = status.migrations.filter(m => !m.applied)

    if (pendingMigrations.length === 0) {
      return {
        success: true,
        message: 'All migrations are up to date',
        applied: [],
        errors: []
      }
    }

    // Actually execute the migration files
    const applied: string[] = []
    const errors: string[] = []

    for (const migration of pendingMigrations) {
      try {
        console.log(`[Migration] Applying ${migration.id}: ${migration.name}`)
        await this.applyMigration(migration)
        await this.markMigrationApplied(migration.id, migration.name, migration.filename)
        applied.push(migration.id)
        console.log(`[Migration] Successfully applied ${migration.id}`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[Migration] Failed to apply migration ${migration.id}:`, errorMessage)
        errors.push(`${migration.id}: ${errorMessage}`)
        // Continue with other migrations instead of stopping on first failure
        // This allows independent migrations to still be applied
      }
    }

    if (errors.length > 0 && applied.length === 0) {
      return {
        success: false,
        message: `Failed to apply migrations: ${errors.join('; ')}`,
        applied,
        errors
      }
    }

    return {
      success: true,
      message: applied.length > 0
        ? `Applied ${applied.length} migration(s)${errors.length > 0 ? ` (${errors.length} failed)` : ''}`
        : 'No migrations applied',
      applied,
      errors
    }
  }

  /**
   * Apply a specific migration
   */
  private async applyMigration(migration: Migration): Promise<void> {
    // Get the actual migration SQL from the bundle
    const migrationSQL = getMigrationSQLById(migration.id)

    if (migrationSQL === undefined) {
      throw new Error(`Migration SQL not found for ${migration.id}`)
    }

    if (migrationSQL.trim() === '') {
      console.log(`[Migration] Skipping empty migration ${migration.id}`)
      return
    }

    // Split SQL into individual statements, handling triggers properly
    const statements = this.splitSQLStatements(migrationSQL)

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await this.db.prepare(statement).run()
        } catch (error) {
          // Check if it's a "already exists" type error and skip it
          const errorMessage = error instanceof Error ? error.message : String(error)
          if (errorMessage.includes('already exists') ||
              errorMessage.includes('duplicate column name') ||
              errorMessage.includes('UNIQUE constraint failed')) {
            console.log(`[Migration] Skipping (already exists): ${statement.substring(0, 50)}...`)
            continue
          }
          console.error(`[Migration] Error executing statement: ${statement.substring(0, 100)}...`)
          throw error
        }
      }
    }
  }

  /**
   * Split SQL into statements, handling CREATE TRIGGER properly
   */
  private splitSQLStatements(sql: string): string[] {
    const statements: string[] = []
    let current = ''
    let inTrigger = false

    const lines = sql.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()

      // Skip comments and empty lines
      if (trimmed.startsWith('--') || trimmed.length === 0) {
        continue
      }

      // Check if we're entering a trigger
      if (trimmed.toUpperCase().includes('CREATE TRIGGER')) {
        inTrigger = true
      }

      current += line + '\n'

      // Check if we're exiting a trigger
      if (inTrigger && trimmed.toUpperCase() === 'END;') {
        statements.push(current.trim())
        current = ''
        inTrigger = false
      }
      // Check for regular statement end (not in trigger)
      else if (!inTrigger && trimmed.endsWith(';')) {
        statements.push(current.trim())
        current = ''
      }
    }

    // Add any remaining statement
    if (current.trim()) {
      statements.push(current.trim())
    }

    return statements.filter(s => s.length > 0)
  }

  /**
   * Validate database schema
   */
  async validateSchema(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = []

    // Basic table existence checks
    const requiredTables = [
      'users',
      'collections',
      'content',
      'content_versions',
      'content_fields',
      'media',
      'settings',
      'activity_logs',
      'password_history',
      'user_profiles',
      'system_logs',
      'log_config',
      'security_events',
      'analytics_events',
    ]

    for (const table of requiredTables) {
      try {
        await this.db.prepare(`SELECT COUNT(*) FROM ${table} LIMIT 1`).first()
      } catch (error) {
        issues.push(`Missing table: ${table}`)
      }
    }

    return {
      valid: issues.length === 0,
      issues
    }
  }
}
