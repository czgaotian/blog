export interface CreateCollectionInput {
  name: string
  displayName: string
  description?: string | null
}

export interface CreateCollectionOptions {
  db: D1Database
  input: CreateCollectionInput
  cacheKv?: KVNamespace
  id?: string
  now?: number
}

export type CreateCollectionResult =
  | { created: true; id: string; name: string }
  | { created: false; reason: 'duplicate'; name: string }

export interface UpdateCollectionInput {
  displayName?: string
  description?: string | null
  isActive?: boolean
}

export interface UpdateCollectionOptions {
  db: D1Database
  id: string
  input: UpdateCollectionInput
  cacheKv?: KVNamespace
  now?: number
}

export type UpdateCollectionResult =
  | { updated: true; id: string; name: string }
  | { updated: false; reason: 'not_found' }
  | { updated: false; reason: 'no_fields'; name: string }

export interface AddCollectionFieldInput {
  fieldName: string
  fieldLabel: string
  fieldType: string
  isRequired: boolean
  isSearchable: boolean
  fieldOptions: Record<string, unknown>
}

export interface AddCollectionFieldOptions {
  db: D1Database
  collectionId: string
  input: AddCollectionFieldInput
  cacheKv?: KVNamespace
  now?: number
}

export type AddCollectionFieldResult =
  | { added: true; id: string; collectionId: string; collectionName: string }
  | { added: false; reason: 'collection_not_found' }
  | { added: false; reason: 'duplicate_field'; fieldName: string }

export async function invalidateCollectionCache(
  cacheKv: KVNamespace | undefined,
  collectionName?: string,
): Promise<void> {
  if (!cacheKv) return

  try {
    await cacheKv.delete('cache:collections:all')
    if (collectionName) {
      await cacheKv.delete(`cache:collection:${collectionName}`)
    }
  } catch (error) {
    console.error('[collection-domain] Error clearing collection cache:', error)
  }
}

export async function createCollection(options: CreateCollectionOptions): Promise<CreateCollectionResult> {
  const { db, input, cacheKv } = options
  const existing = await db
    .prepare('SELECT id FROM collections WHERE name = ?')
    .bind(input.name)
    .first()

  if (existing) {
    return {
      created: false,
      reason: 'duplicate',
      name: input.name,
    }
  }

  const id = options.id ?? crypto.randomUUID()
  const now = options.now ?? Date.now()
  const schema = { type: 'object', properties: {}, required: [] }

  await db
    .prepare('INSERT INTO collections (id, name, display_name, description, schema, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)')
    .bind(id, input.name, input.displayName, input.description ?? null, JSON.stringify(schema), now, now)
    .run()

  await invalidateCollectionCache(cacheKv, input.name)

  return {
    created: true,
    id,
    name: input.name,
  }
}

export async function addCollectionField(options: AddCollectionFieldOptions): Promise<AddCollectionFieldResult> {
  const { db, collectionId, input, cacheKv } = options
  const row = await db
    .prepare('SELECT * FROM collections WHERE id = ?')
    .bind(collectionId)
    .first() as any

  if (!row) {
    return { added: false, reason: 'collection_not_found' }
  }

  const schema = parseCollectionSchema(row.schema)
  if (!schema.properties) schema.properties = {}
  if (!schema.required) schema.required = []

  if (schema.properties[input.fieldName]) {
    return {
      added: false,
      reason: 'duplicate_field',
      fieldName: input.fieldName,
    }
  }

  schema.properties[input.fieldName] = buildFieldConfig(input)
  if (input.isRequired && !schema.required.includes(input.fieldName)) {
    schema.required.push(input.fieldName)
  }

  await db
    .prepare('UPDATE collections SET schema = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify(schema), options.now ?? Date.now(), collectionId)
    .run()

  await invalidateCollectionCache(cacheKv, row.name)

  return {
    added: true,
    id: `schema-${input.fieldName}`,
    collectionId,
    collectionName: row.name,
  }
}

export async function updateCollection(options: UpdateCollectionOptions): Promise<UpdateCollectionResult> {
  const { db, id, input, cacheKv } = options
  const existing = await db
    .prepare('SELECT name FROM collections WHERE id = ?')
    .bind(id)
    .first() as { name: string } | null

  if (!existing) {
    return {
      updated: false,
      reason: 'not_found',
    }
  }

  const fields: string[] = []
  const vals: unknown[] = []
  if (input.displayName !== undefined) {
    fields.push('display_name = ?')
    vals.push(input.displayName)
  }
  if (input.description !== undefined) {
    fields.push('description = ?')
    vals.push(input.description)
  }
  if (input.isActive !== undefined) {
    fields.push('is_active = ?')
    vals.push(input.isActive ? 1 : 0)
  }

  if (fields.length === 0) {
    return {
      updated: false,
      reason: 'no_fields',
      name: existing.name,
    }
  }

  fields.push('updated_at = ?')
  vals.push(options.now ?? Date.now(), id)
  await db
    .prepare(`UPDATE collections SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...vals)
    .run()

  await invalidateCollectionCache(cacheKv, existing.name)

  return {
    updated: true,
    id,
    name: existing.name,
  }
}

function parseCollectionSchema(rawSchema: unknown): any {
  if (!rawSchema) return { type: 'object', properties: {}, required: [] }
  if (typeof rawSchema === 'object') return rawSchema

  try {
    return JSON.parse(String(rawSchema))
  } catch {
    return { type: 'object', properties: {}, required: [] }
  }
}

function buildFieldConfig(input: AddCollectionFieldInput): Record<string, unknown> {
  const fieldConfig: Record<string, unknown> = {
    type: input.fieldType === 'number' ? 'number' : input.fieldType === 'boolean' ? 'boolean' : 'string',
    title: input.fieldLabel,
    searchable: input.isSearchable,
    ...input.fieldOptions,
  }

  if (hasFormat(input.fieldType)) {
    fieldConfig.format = input.fieldType
  }

  return fieldConfig
}

function hasFormat(fieldType: string): boolean {
  return ['richtext', 'quill', 'markdown', 'date', 'slug', 'media', 'reference'].includes(fieldType)
}

export interface DeleteCollectionOptions {
  db: D1Database
  id: string
  cacheKv?: KVNamespace
  blockManaged?: boolean
}

export type DeleteCollectionResult =
  | { deleted: true; id: string; name: string }
  | { deleted: false; reason: 'not_found' }
  | { deleted: false; reason: 'managed'; name: string }
  | { deleted: false; reason: 'has_content'; name: string; count: number }

export async function deleteCollection(options: DeleteCollectionOptions): Promise<DeleteCollectionResult> {
  const { db, id, cacheKv, blockManaged = true } = options
  const collection = await db
    .prepare('SELECT name, managed FROM collections WHERE id = ?')
    .bind(id)
    .first() as { name: string; managed?: number | boolean } | null

  if (!collection) {
    return { deleted: false, reason: 'not_found' }
  }

  if (blockManaged && Boolean(collection.managed)) {
    return { deleted: false, reason: 'managed', name: collection.name }
  }

  const contentResult = await db
    .prepare('SELECT COUNT(*) as count FROM content WHERE collection_id = ?')
    .bind(id)
    .first() as { count?: number } | null
  const contentCount = Number(contentResult?.count || 0)

  if (contentCount > 0) {
    return {
      deleted: false,
      reason: 'has_content',
      name: collection.name,
      count: contentCount,
    }
  }

  await db.prepare('DELETE FROM content_fields WHERE collection_id = ?').bind(id).run()
  await db.prepare('DELETE FROM collections WHERE id = ?').bind(id).run()
  await invalidateCollectionCache(cacheKv, collection.name)

  return {
    deleted: true,
    id,
    name: collection.name,
  }
}
