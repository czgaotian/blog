/**
 * Collection Schema Types
 *
 * These types describe dynamic collection schemas stored in the CMS database.
 */

export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'email'
  | 'url'
  | 'richtext'
  | 'markdown'
  | 'mdxeditor'
  | 'easymde'
  | 'quill'
  | 'tinymce'
  | 'json'
  | 'array'
  | 'object'
  | 'reference'
  | 'media'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'textarea'
  | 'slug'
  | 'color'
  | 'file'
  | 'tinymce'
  | 'quill'
  | 'easymde'

export interface BlockDefinition {
  label?: string
  description?: string
  properties: Record<string, FieldConfig>
}

export type BlockDefinitions = Record<string, BlockDefinition>

export interface FieldConfig {
  type: FieldType
  title?: string
  description?: string
  required?: boolean
  default?: any
  placeholder?: string
  helpText?: string

  // Validation
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string

  // Select/Radio/Multiselect options
  enum?: string[]
  enumLabels?: string[]

  // Reference field
  collection?: string | string[]

  // Array/Object fields
  items?: FieldConfig
  itemTitle?: string
  properties?: Record<string, FieldConfig>
  blocks?: BlockDefinitions
  discriminator?: string
  collapsed?: boolean
  objectLayout?: 'nested' | 'flat'

  // UI hints
  format?: string
  widget?: string

  // Conditional display
  dependsOn?: string
  showWhen?: any
}

export interface CollectionSchema {
  type: 'object'
  properties: Record<string, FieldConfig>
  required?: string[]
}
