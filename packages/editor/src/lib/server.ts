import { generateHTML, type JSONContent } from "@tiptap/core";
import { sanitizeRichText } from "@worker-blog/shared/utils/sanitize";
import { createContentRenderExtensions } from "./extensions";

export function renderTiptapJsonToHtml(document: JSONContent): string {
  return sanitizeRichText(generateHTML(document, createContentRenderExtensions()));
}
