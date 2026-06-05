import { zodResolver } from '@hookform/resolvers/zod'
import type { CategoryListItem } from '@worker-blog/shared/admin-api'
import { Edit, FolderTree, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  useCategoriesList,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '../api/taxonomies'
import { AdminApiError } from '../api/client'
import { PageHeader } from '../components/page-header'
import { ConfirmDialog } from '../components/content/confirm-dialog'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Dialog } from '../components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { LoadingState } from '../components/ui/loading-state'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { Spinner } from '../components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Textarea } from '../components/ui/textarea'
import {
  EMPTY_CATEGORY_FORM_VALUES,
  categoryFormSchema,
  categoryFormToCreateRequest,
  categoryFormToUpdateRequest,
  detailToCategoryFormValues,
  type CategoryFormValues,
} from '../lib/category-form'

export function CategoriesListPage() {
  const categories = useCategoriesList()
  const createMutation = useCreateCategory()
  const [editing, setEditing] = useState<CategoryListItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<CategoryListItem | null>(null)
  const updateMutation = useUpdateCategory(editing?.id ?? '')
  const deleteMutation = useDeleteCategory(deleting?.id ?? '')

  const formOpen = creating || Boolean(editing)
  const formValues = useMemo(
    () => editing ? detailToCategoryFormValues(editing) : EMPTY_CATEGORY_FORM_VALUES,
    [editing],
  )
  const categoryNames = useMemo(() => {
    const names = new Map<string, string>()
    for (const category of categories.data?.items ?? []) {
      names.set(category.id, category.name)
    }
    return names
  }, [categories.data?.items])

  function closeForm() {
    setCreating(false)
    setEditing(null)
    createMutation.reset()
    updateMutation.reset()
  }

  async function handleSubmit(values: CategoryFormValues) {
    if (editing) {
      await updateMutation.mutateAsync(categoryFormToUpdateRequest(values))
    } else {
      await createMutation.mutateAsync(categoryFormToCreateRequest(values))
    }
    closeForm()
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync()
      setDeleting(null)
    } catch {
      // Mutation error is displayed in the dialog.
    }
  }

  const formError = createMutation.error || updateMutation.error

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Categories"
        description="Manage content categories and hierarchy."
        actions={(
          <Button type="button" onClick={() => setCreating(true)}>
            <Plus />
            New category
          </Button>
        )}
      />

      {categories.isLoading ? <LoadingState label="Loading categories" /> : null}
      {categories.isError ? <Alert title="Failed to load categories" tone="danger">Could not fetch categories. Try refreshing the page.</Alert> : null}

      {categories.data ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Sort</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.data.items.length === 0 ? (
              <TableRow><TableCell className="text-center text-muted-foreground" colSpan={7}>No categories found.</TableCell></TableRow>
            ) : categories.data.items.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    <FolderTree className="size-4 text-muted-foreground" />
                    {category.name}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{category.slug}</TableCell>
                <TableCell className="text-sm">
                  {category.parentId ? categoryNames.get(category.parentId) ?? 'Unknown category' : '—'}
                </TableCell>
                <TableCell className="text-sm">{category.sortOrder}</TableCell>
                <TableCell className="max-w-80 truncate text-sm text-muted-foreground">
                  {category.description || '—'}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(category.updatedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Edit ${category.name}`}
                      onClick={() => setEditing(category)}
                    >
                      <Edit />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete ${category.name}`}
                      onClick={() => setDeleting(category)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      <CategoryFormDialog
        open={formOpen}
        title={editing ? 'Edit category' : 'New category'}
        values={formValues}
        categories={categories.data?.items ?? []}
        editingId={editing?.id}
        pending={createMutation.isPending || updateMutation.isPending}
        error={formError instanceof AdminApiError ? formError.message : formError ? 'Unexpected error' : undefined}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete category?"
        confirmLabel="Delete category"
        pendingLabel="Deleting..."
        destructive
        pending={deleteMutation.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      >
        {deleteMutation.isError ? (
          <Alert title="Could not delete category" tone="danger">
            {deleteMutation.error instanceof AdminApiError ? deleteMutation.error.message : 'Unexpected error'}
          </Alert>
        ) : (
          <>“{deleting?.name}” will be removed from the category list.</>
        )}
      </ConfirmDialog>
    </section>
  )
}

interface CategoryFormDialogProps {
  open: boolean
  title: string
  values: CategoryFormValues
  categories: CategoryListItem[]
  editingId?: string
  pending: boolean
  error?: string
  onClose: () => void
  onSubmit: (values: CategoryFormValues) => Promise<void>
}

function CategoryFormDialog({
  open,
  title,
  values,
  categories,
  editingId,
  pending,
  error,
  onClose,
  onSubmit,
}: CategoryFormDialogProps) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: values,
  })
  const { errors } = form.formState
  const parentOptions = categories.filter((category) => category.id !== editingId)

  useEffect(() => {
    form.reset(values)
  }, [form, values])

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form className="flex flex-col gap-5" onSubmit={form.handleSubmit(onSubmit)}>
        {error ? <Alert title="Could not save category" tone="danger">{error}</Alert> : null}

        <FieldGroup>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="category-name">Name</FieldLabel>
            <Input id="category-name" aria-invalid={!!errors.name} {...form.register('name')} />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field data-invalid={!!errors.slug}>
            <FieldLabel htmlFor="category-slug">Slug</FieldLabel>
            <Input id="category-slug" aria-invalid={!!errors.slug} {...form.register('slug')} />
            <FieldDescription>Leave blank when creating a category to generate it from the name.</FieldDescription>
            <FieldError errors={[errors.slug]} />
          </Field>

          <Field data-invalid={!!errors.parentId}>
            <FieldLabel>Parent category</FieldLabel>
            <Controller
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}>
                  <SelectTrigger className="w-full" aria-invalid={!!errors.parentId}>
                    <SelectValue placeholder="No parent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">No parent</SelectItem>
                      {parentOptions.map((category) => (
                        <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.parentId]} />
          </Field>

          <Field data-invalid={!!errors.sortOrder}>
            <FieldLabel htmlFor="category-sort-order">Sort order</FieldLabel>
            <Input
              id="category-sort-order"
              type="number"
              inputMode="numeric"
              aria-invalid={!!errors.sortOrder}
              {...form.register('sortOrder', { valueAsNumber: true })}
            />
            <FieldError errors={[errors.sortOrder]} />
          </Field>

          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="category-description">Description</FieldLabel>
            <Textarea
              id="category-description"
              rows={3}
              aria-invalid={!!errors.description}
              {...form.register('description')}
            />
            <FieldError errors={[errors.description]} />
          </Field>
        </FieldGroup>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            {pending ? 'Saving...' : 'Save category'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
