import { zodResolver } from "@hookform/resolvers/zod";
import { SimpleEditor } from "@worker-blog/editor/react";
import type { ContentStatus } from "@worker-blog/shared/admin-api";
import { Plus } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useEffect } from "react";
import { Link } from "react-router";
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

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-6">
        {error ? (
          <Alert title="Could not save content" tone="danger">
            {error}
          </Alert>
        ) : null}
        {success ? <Alert title={success} tone="success" /> : null}

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
                    Leave blank when creating content to generate it from the
                    title.
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
                      <FieldLabel htmlFor="publishedAt">Publish time</FieldLabel>
                      <Input
                        id="publishedAt"
                        type="datetime-local"
                        aria-invalid={!!errors.publishedAt}
                        {...form.register("publishedAt")}
                      />
                      <FieldError errors={[errors.publishedAt]} />
                    </Field>
                  ) : null}
                  <Button type="submit" disabled={pending}>
                    {pending ? <Spinner /> : null}
                    {pending ? pendingLabel : submitLabel}
                  </Button>
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
                              field.onChange(value === "none" ? "" : value)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="No category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectItem value="none">No category</SelectItem>
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
                  <SimpleEditor
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <FieldError errors={[errors.bodyJson]} />
            </Field>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
