import { generateHTML, type JSONContent } from "@tiptap/core";
import { createContentRenderExtensions } from "./extensions";
import { sanitizeRichText } from "@worker-blog/shared/utils/sanitize";

export function renderTiptapJsonToHtml(document: JSONContent): string {
  return sanitizeRichText(
    generateHTML(document, createContentRenderExtensions()),
  );
}
