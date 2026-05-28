export interface SchemaValidationResult {
  valid: boolean
  errors: string[]
  data: Record<string, unknown>
}

type JsonSchema = {
  type?: string
  properties?: Record<string, any>
  required?: string[]
}

export function validateContentData(
  rawSchema: unknown,
  rawData: unknown,
  systemData: Record<string, unknown> = {},
): SchemaValidationResult {
  const schema = parseSchema(rawSchema)
  const data = normalizeData(rawData)

  if (!schema?.properties) {
    return { valid: true, errors: [], data }
  }

  const errors: string[] = []
  const allowedFields = new Set(Object.keys(schema.properties))

  for (const key of Object.keys(data)) {
    if (!allowedFields.has(key)) {
      errors.push(`Unknown field "${key}"`)
    }
  }

  for (const fieldName of schema.required || []) {
    if (!hasValue(data[fieldName]) && !hasValue(systemData[fieldName])) {
      errors.push(`Field "${fieldName}" is required`)
    }
  }

  for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
    const value = hasValue(data[fieldName]) ? data[fieldName] : systemData[fieldName]
    if (!hasValue(value)) continue
    const error = validateFieldValue(fieldName, fieldSchema, value)
    if (error) errors.push(error)
  }

  return {
    valid: errors.length === 0,
    errors,
    data,
  }
}

function parseSchema(rawSchema: unknown): JsonSchema | null {
  if (!rawSchema) return null
  if (typeof rawSchema === 'object') return rawSchema as JsonSchema

  try {
    return JSON.parse(String(rawSchema)) as JsonSchema
  } catch {
    return null
  }
}

function normalizeData(rawData: unknown): Record<string, unknown> {
  if (!rawData) return {}
  if (typeof rawData === 'object' && !Array.isArray(rawData)) {
    return rawData as Record<string, unknown>
  }
  return {}
}

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

function validateFieldValue(fieldName: string, fieldSchema: any, value: unknown): string | null {
  const type = normalizeFieldType(fieldSchema)

  if (type === 'string' && typeof value !== 'string') {
    return `Field "${fieldName}" must be a string`
  }

  if (type === 'number' && typeof value !== 'number') {
    return `Field "${fieldName}" must be a number`
  }

  if (type === 'boolean' && typeof value !== 'boolean') {
    return `Field "${fieldName}" must be a boolean`
  }

  if (type === 'array' && !Array.isArray(value)) {
    return `Field "${fieldName}" must be an array`
  }

  if (type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
    return `Field "${fieldName}" must be an object`
  }

  const enumValues = Array.isArray(fieldSchema.enum) ? fieldSchema.enum : null
  if (enumValues && !enumValues.includes(value)) {
    return `Field "${fieldName}" must be one of: ${enumValues.join(', ')}`
  }

  return null
}

function normalizeFieldType(fieldSchema: any): string {
  if (fieldSchema?.type) return String(fieldSchema.type)

  const format = String(fieldSchema?.format || '')
  if (['richtext', 'quill', 'markdown', 'media', 'reference', 'date', 'slug'].includes(format)) {
    return 'string'
  }

  return 'string'
}
