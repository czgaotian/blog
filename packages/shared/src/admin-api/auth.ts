import { z } from 'zod'

export const adminPluginMenuItemSchema = z.object({
  label: z.string(),
  path: z.string(),
  icon: z.string(),
})

export const adminMeResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    role: z.string(),
  }),
  permissions: z.array(z.string()),
  app: z.object({
    name: z.string(),
    version: z.string(),
  }),
  pluginMenu: z.array(adminPluginMenuItemSchema),
})

export type AdminPluginMenuItem = z.infer<typeof adminPluginMenuItemSchema>
export type AdminMeResponse = z.infer<typeof adminMeResponseSchema>
