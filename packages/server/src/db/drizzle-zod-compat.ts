import {
  createInsertSchema as createInsertSchemaBase,
  createSelectSchema as createSelectSchemaBase,
} from 'drizzle-zod'

// Drizzle ORM and drizzle-zod are currently on mismatched generic signatures.
// Keep runtime behavior from drizzle-zod while relaxing the compile-time contract
// so the package migration can complete without pinning a broader dependency change.
export const createInsertSchema = ((table: unknown, refine?: unknown) =>
  (createInsertSchemaBase as any)(table, refine)) as <TTable>(
  table: TTable,
  refine?: unknown,
) => any

export const createSelectSchema = ((table: unknown, refine?: unknown) =>
  (createSelectSchemaBase as any)(table, refine)) as <TTable>(
  table: TTable,
  refine?: unknown,
) => any
