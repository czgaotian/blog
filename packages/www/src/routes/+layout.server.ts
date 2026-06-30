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

export const load: LayoutServerLoad = async ({ locals, url }) => {
  return {
    settings: locals.settings ?? fallbackSettings,
    currentPath: url.pathname || "/",
  };
};
