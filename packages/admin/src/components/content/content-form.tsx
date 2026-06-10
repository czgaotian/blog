import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Editor, type UploadFunction } from "@worker-blog/editor";
import type { ContentStatus } from "@worker-blog/shared/admin-api";
import { ChevronDown, Plus } from "lucide-react";
import { Controller, type FieldErrors, useForm } from "react-hook-form";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { uploadMediaFile } from "../../api/media";
import { useCategoriesList, useTagsList } from "../../api/taxonomies";
import {
  contentFormSchema,
  type ContentFormValues,
} from "../../lib/content-form";
import { Alert } from "../ui/alert";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "../ui/field";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Spinner } from "../ui/spinner";
import { Textarea } from "../ui/textarea";
import { CoverImagePicker } from "./cover-image-picker";

const STATUS_OPTIONS: Array<{
  value: Exclude<ContentStatus, "deleted">;
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "review", label: "In review" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const METADATA_FIELDS: Array<keyof ContentFormValues> = [
  "title",
  "slug",
  "excerpt",
  "status",
  "categoryId",
  "coverImageId",
  "tagIds",
  "publishedAt",
];

interface ContentFormProps {
  values: ContentFormValues;
  submitLabel: string;
  pendingLabel: string;
  pending?: boolean;
  error?: string;
  success?: string;
  onDirtyChange?: (dirty: boolean) => void;
  onSubmit: (values: ContentFormValues) => Promise<void>;
}

export function ContentForm({
  values,
  submitLabel,
  pendingLabel,
  pending,
  error,
  success,
  onDirtyChange,
  onSubmit,
}: ContentFormProps) {
  const categories = useCategoriesList();
  const tags = useTagsList();
  const queryClient = useQueryClient();
  const [metadataOpen, setMetadataOpen] = useState(true);
  const form = useForm<ContentFormValues>({
    resolver: zodResolver(contentFormSchema) as any,
    defaultValues: values,
  });
  const status = form.watch("status");
  const { errors, isDirty } = form.formState;
  const hasNoCategories =
    categories.isSuccess && categories.data.items.length === 0;
  const hasNoTags = tags.isSuccess && tags.data.items.length === 0;

  useEffect(() => {
    form.reset(values);
  }, [form, values]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const uploadEditorImage = useCallback<UploadFunction>(
    async (file, onProgress, abortSignal) => {
      const response = await uploadMediaFile(file, {
        onProgress,
        signal: abortSignal,
      });
      const uploaded = response.uploaded[0];

      if (!uploaded) {
        throw new Error(response.errors[0]?.error || "Image upload failed");
      }

      await queryClient.invalidateQueries({ queryKey: ["admin", "media"] });

      return {
        src: uploaded.publicUrl,
        mediaId: uploaded.id,
        alt: uploaded.alt ?? uploaded.originalName,
        title: uploaded.originalName,
        width: uploaded.width,
        height: uploaded.height,
      };
    },
    [queryClient],
  );

  const openMetadataOnInvalid = useCallback(
    (invalidErrors: FieldErrors<ContentFormValues>) => {
      if (METADATA_FIELDS.some((field) => invalidErrors[field])) {
        setMetadataOpen(true);
      }
    },
    [],
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit, openMetadataOnInvalid)}>
      <div className="flex flex-col gap-6">
        {error ? (
          <Alert title="Could not save content" tone="danger">
            {error}
          </Alert>
        ) : null}
        {success ? <Alert title={success} tone="success" /> : null}

        <Collapsible
          open={metadataOpen}
          onOpenChange={setMetadataOpen}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold">Metadata</h2>
              <p className="text-sm text-muted-foreground">
                Configure details, publishing, organization, and media.
              </p>
            </div>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={metadataOpen ? "Hide metadata" : "Show metadata"}
              >
                <ChevronDown
                  data-icon="inline-start"
                  className={metadataOpen ? "rotate-180" : undefined}
                />
                {metadataOpen ? "Hide" : "Show"}
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>Content details</CardTitle>
                  <CardDescription>
                    Configure the public title, URL, and summary.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field data-invalid={!!errors.title}>
                      <FieldLabel htmlFor="title">Title</FieldLabel>
                      <Input
                        id="title"
                        aria-invalid={!!errors.title}
                        {...form.register("title")}
                      />
                      <FieldError errors={[errors.title]} />
                    </Field>
                    <Field data-invalid={!!errors.slug}>
                      <FieldLabel htmlFor="slug">Slug</FieldLabel>
                      <Input
                        id="slug"
                        aria-invalid={!!errors.slug}
                        {...form.register("slug")}
                      />
                      <FieldDescription>
                        Leave blank when creating content to generate it from
                        the title.
                      </FieldDescription>
                      <FieldError errors={[errors.slug]} />
                    </Field>
                    <Field data-invalid={!!errors.excerpt}>
                      <FieldLabel htmlFor="excerpt">Excerpt</FieldLabel>
                      <Textarea
                        id="excerpt"
                        rows={4}
                        aria-invalid={!!errors.excerpt}
                        {...form.register("excerpt")}
                      />
                      <FieldError errors={[errors.excerpt]} />
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Publishing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <Field data-invalid={!!errors.status}>
                        <FieldLabel>Status</FieldLabel>
                        <Controller
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger
                                className="w-full"
                                aria-invalid={!!errors.status}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {STATUS_OPTIONS.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <FieldError errors={[errors.status]} />
                      </Field>
                      {status === "scheduled" || status === "published" ? (
                        <Field data-invalid={!!errors.publishedAt}>
                          <FieldLabel htmlFor="publishedAt">
                            Publish time
                          </FieldLabel>
                          <Input
                            id="publishedAt"
                            type="datetime-local"
                            aria-invalid={!!errors.publishedAt}
                            {...form.register("publishedAt")}
                          />
                          <FieldError errors={[errors.publishedAt]} />
                        </Field>
                      ) : null}
                    </FieldGroup>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Organization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FieldGroup>
                      <Field>
                        <FieldLabel>Category</FieldLabel>
                        {hasNoCategories ? (
                          <Button asChild variant="outline" className="w-full">
                            <Link to="/categories">
                              <Plus />
                              Manage categories
                            </Link>
                          </Button>
                        ) : (
                          <Controller
                            control={form.control}
                            name="categoryId"
                            render={({ field }) => (
                              <Select
                                value={field.value || "none"}
                                onValueChange={(value) =>
                                  field.onChange(
                                    value === "none" ? "" : value,
                                  )
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="No category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    <SelectItem value="none">
                                      No category
                                    </SelectItem>
                                    {categories.data?.items.map((category) => (
                                      <SelectItem
                                        key={category.id}
                                        value={category.id}
                                      >
                                        {category.name}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        )}
                      </Field>
                      <Field>
                        <FieldLabel>Tags</FieldLabel>
                        {hasNoTags ? (
                          <Button asChild variant="outline" className="w-full">
                            <Link to="/tags">
                              <Plus />
                              Manage tags
                            </Link>
                          </Button>
                        ) : (
                          <Controller
                            control={form.control}
                            name="tagIds"
                            render={({ field }) => (
                              <div className="flex max-h-52 flex-col gap-3 overflow-y-auto rounded-md border border-border p-3">
                                {tags.data?.items.map((tag) => {
                                  const checked = field.value.includes(tag.id);
                                  return (
                                    <label
                                      key={tag.id}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(next) => {
                                          field.onChange(
                                            next
                                              ? [...field.value, tag.id]
                                              : field.value.filter(
                                                  (id) => id !== tag.id,
                                                ),
                                          );
                                        }}
                                      />
                                      {tag.name}
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          />
                        )}
                      </Field>
                    </FieldGroup>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2 xl:col-span-1">
                  <CardHeader>
                    <CardTitle>Cover image</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Controller
                      control={form.control}
                      name="coverImageId"
                      render={({ field }) => (
                        <CoverImagePicker
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Card>
          <CardHeader>
            <CardTitle>Body</CardTitle>
            <CardDescription>Write the article content.</CardDescription>
          </CardHeader>
          <CardContent>
            <Field data-invalid={!!errors.bodyJson}>
              <Controller
                control={form.control}
                name="bodyJson"
                render={({ field }) => (
                  <Editor
                    value={field.value}
                    onChange={field.onChange}
                    uploadImage={uploadEditorImage}
                  />
                )}
              />
              <FieldError errors={[errors.bodyJson]} />
            </Field>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            {pending ? pendingLabel : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
