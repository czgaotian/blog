import { fetchPublicSettings } from "$lib/server/api";
import type { LayoutServerLoad } from "./$types";

const fallbackSettings = {
  siteName: "Worker Blog",
  siteDescription: "A modern headless CMS powered by AI",
  siteUrl: "",
  faviconUrl: "",
  timezone: "UTC",
  language: "en",
  maintenanceMode: false,
};

export const load: LayoutServerLoad = async ({ fetch }) => {
  try {
    const response = await fetchPublicSettings(fetch);
    return { settings: response.data };
  } catch {
    return { settings: fallbackSettings };
  }
};
