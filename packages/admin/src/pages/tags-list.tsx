import { zodResolver } from '@hookform/resolvers/zod'
import type { TagListItem } from '@worker-blog/shared/admin-api'
import { Edit, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  useCreateTag,
  useDeleteTag,
  useTagsList,
  useUpdateTag,
} from '../api/taxonomies'
import { AdminApiError } from '../api/client'
import { PageHeader } from '../components/page-header'
import { ConfirmDialog } from '../components/content/confirm-dialog'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { ColorPicker } from '../components/ui/colorpicker'
import { Dialog } from '../components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { LoadingState } from '../components/ui/loading-state'
import { Spinner } from '../components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Textarea } from '../components/ui/textarea'
import {
  EMPTY_TAG_FORM_VALUES,
  detailToTagFormValues,
  tagFormSchema,
  tagFormToCreateRequest,
  tagFormToUpdateRequest,
  type TagFormValues,
} from '../lib/tag-form'

export function TagsListPage() {
  const tags = useTagsList()
  const createMutation = useCreateTag()
  const [editing, setEditing] = useState<TagListItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<TagListItem | null>(null)
  const updateMutation = useUpdateTag(editing?.id ?? '')
  const deleteMutation = useDeleteTag(deleting?.id ?? '')

  const formOpen = creating || Boolean(editing)
  const formValues = useMemo(
    () => editing ? detailToTagFormValues(editing) : EMPTY_TAG_FORM_VALUES,
    [editing],
  )

  function closeForm() {
    setCreating(false)
    setEditing(null)
    createMutation.reset()
    updateMutation.reset()
  }

  async function handleSubmit(values: TagFormValues) {
    if (editing) {
      await updateMutation.mutateAsync(tagFormToUpdateRequest(values))
    } else {
      await createMutation.mutateAsync(tagFormToCreateRequest(values))
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
        title="Tags"
        description="Manage reusable content tags."
        actions={(
          <Button type="button" onClick={() => setCreating(true)}>
            <Plus />
            New tag
          </Button>
        )}
      />

      {tags.isLoading ? <LoadingState label="Loading tags" /> : null}
      {tags.isError ? <Alert title="Failed to load tags" tone="danger">Could not fetch tags. Try refreshing the page.</Alert> : null}

      {tags.data ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Color</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.data.items.length === 0 ? (
              <TableRow><TableCell className="text-center text-muted-foreground" colSpan={6}>No tags found.</TableCell></TableRow>
            ) : tags.data.items.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className="size-4 rounded-full border border-border"
                      style={{ backgroundColor: tag.color }}
                      aria-hidden="true"
                    />
                    <span className="font-mono text-xs text-muted-foreground">{tag.color}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{tag.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{tag.slug}</TableCell>
                <TableCell className="max-w-80 truncate text-sm text-muted-foreground">
                  {tag.description || '—'}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(tag.updatedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Edit ${tag.name}`}
                      onClick={() => setEditing(tag)}
                    >
                      <Edit />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete ${tag.name}`}
                      onClick={() => setDeleting(tag)}
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

      <TagFormDialog
        open={formOpen}
        title={editing ? 'Edit tag' : 'New tag'}
        values={formValues}
        pending={createMutation.isPending || updateMutation.isPending}
        error={formError instanceof AdminApiError ? formError.message : formError ? 'Unexpected error' : undefined}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete tag?"
        confirmLabel="Delete tag"
        pendingLabel="Deleting..."
        destructive
        pending={deleteMutation.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      >
        {deleteMutation.isError ? (
          <Alert title="Could not delete tag" tone="danger">
            {deleteMutation.error instanceof AdminApiError ? deleteMutation.error.message : 'Unexpected error'}
          </Alert>
        ) : (
          <>“{deleting?.name}” will be removed from the tag list.</>
        )}
      </ConfirmDialog>
    </section>
  )
}

interface TagFormDialogProps {
  open: boolean
  title: string
  values: TagFormValues
  pending: boolean
  error?: string
  onClose: () => void
  onSubmit: (values: TagFormValues) => Promise<void>
}

function TagFormDialog({
  open,
  title,
  values,
  pending,
  error,
  onClose,
  onSubmit,
}: TagFormDialogProps) {
  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: values,
  })
  const { errors } = form.formState

  useEffect(() => {
    form.reset(values)
  }, [form, values])

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form className="flex flex-col gap-5" onSubmit={form.handleSubmit(onSubmit)}>
        {error ? <Alert title="Could not save tag" tone="danger">{error}</Alert> : null}

        <FieldGroup>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="tag-name">Name</FieldLabel>
            <Input id="tag-name" aria-invalid={!!errors.name} {...form.register('name')} />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field data-invalid={!!errors.slug}>
            <FieldLabel htmlFor="tag-slug">Slug</FieldLabel>
            <Input id="tag-slug" aria-invalid={!!errors.slug} {...form.register('slug')} />
            <FieldDescription>Leave blank when creating a tag to generate it from the name.</FieldDescription>
            <FieldError errors={[errors.slug]} />
          </Field>

          <Field data-invalid={!!errors.description}>
            <FieldLabel htmlFor="tag-description">Description</FieldLabel>
            <Textarea
              id="tag-description"
              rows={3}
              aria-invalid={!!errors.description}
              {...form.register('description')}
            />
            <FieldError errors={[errors.description]} />
          </Field>

          <Field data-invalid={!!errors.color}>
            <FieldLabel htmlFor="tag-color">Color</FieldLabel>
            <Controller
              control={form.control}
              name="color"
              render={({ field }) => (
                <ColorPicker
                  id="tag-color"
                  value={field.value}
                  onChange={field.onChange}
                  aria-invalid={!!errors.color}
                />
              )}
            />
            <FieldError errors={[errors.color]} />
          </Field>
        </FieldGroup>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            {pending ? 'Saving...' : 'Save tag'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
