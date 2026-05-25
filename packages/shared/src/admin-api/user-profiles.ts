export interface UserProfileFieldDefinitionData {
  name: string
  label: string
  type: string
  options?: string[]
  default?: unknown
  required?: boolean
  placeholder?: string
  helpText?: string
  hidden?: boolean
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}

export interface UserProfileSchemaData {
  fields: UserProfileFieldDefinitionData[]
  registrationFields: string[]
}

export interface UserProfileCustomDataResponse {
  userId: string
  customData: Record<string, unknown>
}

export interface UpdateUserProfileCustomDataRequest {
  customData: Record<string, unknown>
}
