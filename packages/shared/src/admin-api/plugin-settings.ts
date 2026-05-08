import { z } from 'zod'

export interface PluginSettingField {
  key: string
  label: string
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea'
  description: string | null
  defaultValue: unknown
  options?: Array<{ value: string; label: string }>
}

export interface PluginSettingsResponse {
  pluginId: string
  displayName: string
  description: string | null
  version: string
  status: string
  settings: Record<string, unknown>
  schema: PluginSettingField[]
}

export const updatePluginSettingsSchema = z.object({
  settings: z.record(z.string(), z.unknown()),
})

export type UpdatePluginSettingsRequest = z.infer<typeof updatePluginSettingsSchema>

export interface UpdatePluginSettingsResponse {
  message: string
}
