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

export const load: LayoutServerLoad = async ({ fetch, locals, url }) => {
  const currentPath = url.pathname || "/";

  if (locals.settings) {
    return { settings: locals.settings, currentPath };
  }

  try {
    const response = await fetchPublicSettings(fetch);
    return { settings: response.data, currentPath };
  } catch {
    return { settings: fallbackSettings, currentPath };
  }
};
