import type {
  ContentDetailResponse,
  ContentStatus,
  CreateContentRequest,
  UpdateContentRequest,
} from "@worker-blog/shared/admin-api";
import { emptyTiptapDocument, type JSONContent } from "@worker-blog/editor";
import { z } from "zod";

const EDITABLE_STATUSES = [
  "draft",
  "review",
  "scheduled",
  "published",
  "archived",
] as const;

export const tiptapDocumentSchema = z.custom<JSONContent>(
  (value) =>
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "type" in value &&
    value.type === "doc",
  "Body must be a doc-root Tiptap JSONContent document",
);

export const contentFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(500),
    slug: z.string().trim().max(500),
    excerpt: z.string().max(1000, "Excerpt must be 1,000 characters or fewer"),
    bodyJson: tiptapDocumentSchema,
    status: z.enum(EDITABLE_STATUSES),
    categoryId: z.string(),
    coverImageId: z.string(),
    tagIds: z.array(z.string()),
    publishedAt: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.status !== "scheduled") return;
    if (!values.publishedAt) {
      ctx.addIssue({
        code: "custom",
        message: "Scheduled content requires a publish time",
        path: ["publishedAt"],
      });
      return;
    }
    if (new Date(values.publishedAt).getTime() <= Date.now()) {
      ctx.addIssue({
        code: "custom",
        message: "Scheduled publish time must be in the future",
        path: ["publishedAt"],
      });
    }
  });

export type ContentFormValues = z.infer<typeof contentFormSchema>;

export const EMPTY_CONTENT_FORM_VALUES: ContentFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  bodyJson: cloneEmptyTiptapDocument(),
  status: "draft",
  categoryId: "",
  coverImageId: "",
  tagIds: [],
  publishedAt: "",
};

export function detailToContentFormValues(
  detail: ContentDetailResponse,
): ContentFormValues {
  return {
    title: detail.title,
    slug: detail.slug,
    excerpt: detail.excerpt ?? "",
    bodyJson: detail.bodyJson,
    status: editableStatus(detail.status),
    categoryId: detail.categoryId ?? "",
    coverImageId: detail.coverImageId ?? "",
    tagIds: detail.tagIds,
    publishedAt: toDateTimeLocal(detail.publishedAt),
  };
}

export function contentFormToCreateRequest(
  values: ContentFormValues,
): CreateContentRequest {
  return {
    title: values.title.trim(),
    ...(values.slug.trim() ? { slug: values.slug.trim() } : {}),
    excerpt: values.excerpt.trim() || null,
    bodyJson: values.bodyJson,
    status: values.status,
    categoryId: values.categoryId || null,
    coverImageId: values.coverImageId || null,
    tagIds: values.tagIds,
    metadata: {},
    publishedAt: toIsoOrNull(values.publishedAt),
  };
}

export function contentFormToUpdateRequest(
  values: ContentFormValues,
  metadata: Record<string, unknown>,
): UpdateContentRequest {
  return {
    ...contentFormToCreateRequest(values),
    slug: values.slug.trim(),
    metadata,
  };
}

function editableStatus(status: ContentStatus): ContentFormValues["status"] {
  return status === "deleted" ? "draft" : status;
}

function toDateTimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIsoOrNull(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function cloneEmptyTiptapDocument(): JSONContent {
  return JSON.parse(JSON.stringify(emptyTiptapDocument)) as JSONContent;
}
