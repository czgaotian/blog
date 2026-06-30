import { z } from "zod";

const optionalUrlSchema = z.union([z.literal(""), z.url()]);

export interface GeneralSettingsData {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  faviconUrl: string;
  adminEmail: string;
  timezone: string;
  language: string;
  maintenanceMode: boolean;
}

export interface SecuritySettingsData {
  jwtExpiresIn: string;
  jwtRefreshGraceSeconds: number;
}

export interface SettingsResponse {
  general: GeneralSettingsData;
  security: SecuritySettingsData;
}

export const updateGeneralSettingsSchema = z.object({
  siteName: z.string().min(1).max(255),
  siteDescription: z.string().min(1).max(1000),
  siteUrl: z.url(),
  faviconUrl: optionalUrlSchema,
  adminEmail: z.string().email(),
  timezone: z.string().min(1),
  language: z.string().min(1),
  maintenanceMode: z.boolean(),
});

export const updateSecuritySettingsSchema = z.object({
  jwtExpiresIn: z
    .string()
    .regex(/^\d+(?:s|m|h|d)?$/i, "Must be a number optionally suffixed with s/m/h/d"),
  jwtRefreshGraceSeconds: z
    .number()
    .int()
    .min(0)
    .max(60 * 60 * 24 * 90),
});

export type UpdateGeneralSettingsRequest = z.infer<typeof updateGeneralSettingsSchema>;
export type UpdateSecuritySettingsRequest = z.infer<typeof updateSecuritySettingsSchema>;

export interface UpdateSettingsResponse {
  message: string;
}
