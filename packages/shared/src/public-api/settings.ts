export interface PublicSettingsData {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  faviconUrl: string;
  timezone: string;
  language: string;
  maintenanceMode: boolean;
}

export interface PublicSettingsResponse {
  data: PublicSettingsData;
}
