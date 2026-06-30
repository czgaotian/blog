import { fetchPublicSettings } from "$lib/server/api";
import type { Handle } from "@sveltejs/kit";

function escapeHtmlAttr(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

export const handle: Handle = async ({ event, resolve }) => {
  try {
    const response = await fetchPublicSettings(event.fetch);
    event.locals.settings = response.data;
  } catch {
    event.locals.settings = undefined;
  }

  const language = escapeHtmlAttr(event.locals.settings?.language || "en");

  return resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace(/<html([^>]*) lang="[^"]*">/, `<html$1 lang="${language}">`),
  });
};
