import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import {
  useCollectionDetail,
  useCreateCollection,
  useUpdateCollection,
  useDeleteCollection,
  useCreateField,
  useUpdateField,
  useDeleteField,
} from '../api/collections'
import type { CollectionField } from '@worker-blog/shared/admin-api'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Dialog } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { LoadingState } from '../components/ui/loading-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { AdminApiError } from '../api/client'

const ALL_FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'slug', label: 'URL Slug' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'radio', label: 'Radio' },
  { value: 'media', label: 'Media' },
  { value: 'reference', label: 'Reference' },
  { value: 'richtext', label: 'Rich Text' },
  { value: 'markdown', label: 'Markdown' },
]

type FieldDialogMode = 'add' | 'edit'

interface FieldFormState {
  fieldName: string
  fieldLabel: string
  fieldType: string
  isRequired: boolean
  isSearchable: boolean
}

const emptyFieldForm: FieldFormState = {
  fieldName: '',
  fieldLabel: '',
  fieldType: 'text',
  isRequired: false,
  isSearchable: false,
}

export function CollectionEditPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()

  const { data, isLoading, isError } = useCollectionDetail(isNew ? '' : id!)
  const createCollection = useCreateCollection()
  const updateCollection = useUpdateCollection(isNew ? '' : id!)
  const deleteCollection = useDeleteCollection(isNew ? '' : id!)

  const createField = useCreateField(isNew ? '' : id!)
  const [activeFieldId, setActiveFieldId] = useState<string>('')
  const updateField = useUpdateField(isNew ? '' : id!, activeFieldId)
  const deleteField = useDeleteField(isNew ? '' : id!, activeFieldId)

  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [collectionSaved, setCollectionSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [fieldDialogOpen, setFieldDialogOpen] = useState(false)
  const [fieldDialogMode, setFieldDialogMode] = useState<FieldDialogMode>('add')
  const [fieldForm, setFieldForm] = useState<FieldFormState>(emptyFieldForm)
  const [fieldError, setFieldError] = useState<string | null>(null)

  useEffect(() => {
    if (data && !isNew) {
      setDisplayName(data.displayName)
      setDescription(data.description ?? '')
    }
  }, [data, isNew])

  async function handleCollectionSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCollectionSaved(false)
    if (isNew) {
      const result = await createCollection.mutateAsync({ name, displayName, description: description || undefined })
      navigate(`/admin/collections/${result.id}/edit`)
    } else {
      await updateCollection.mutateAsync({ displayName, description: description || undefined })
      setCollectionSaved(true)
    }
  }

  async function handleDeleteCollection() {
    await deleteCollection.mutateAsync()
    navigate('/admin/collections')
  }

  function openAddField() {
    setFieldForm(emptyFieldForm)
    setFieldError(null)
    setFieldDialogMode('add')
    setFieldDialogOpen(true)
  }

  function openEditField(field: CollectionField) {
    setActiveFieldId(field.id)
    setFieldForm({
      fieldName: field.fieldName,
      fieldLabel: field.fieldLabel,
      fieldType: field.fieldType,
      isRequired: field.isRequired,
      isSearchable: field.isSearchable,
    })
    setFieldError(null)
    setFieldDialogMode('edit')
    setFieldDialogOpen(true)
  }

  async function handleFieldSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldError(null)
    try {
      if (fieldDialogMode === 'add') {
        await createField.mutateAsync({
          fieldName: fieldForm.fieldName,
          fieldLabel: fieldForm.fieldLabel,
          fieldType: fieldForm.fieldType,
          isRequired: fieldForm.isRequired,
          isSearchable: fieldForm.isSearchable,
          fieldOptions: {},
        })
      } else {
        await updateField.mutateAsync({
          fieldLabel: fieldForm.fieldLabel,
          fieldType: fieldForm.fieldType,
          isRequired: fieldForm.isRequired,
          isSearchable: fieldForm.isSearchable,
        })
      }
      setFieldDialogOpen(false)
    } catch (err) {
      setFieldError(err instanceof AdminApiError ? err.message : 'Unexpected error')
    }
  }

  async function handleDeleteField(field: CollectionField) {
    setActiveFieldId(field.id)
    await deleteField.mutateAsync()
  }

  if (!isNew && isLoading) return <LoadingState label="Loading collection" />
  if (!isNew && isError) return <Alert title="Failed to load collection" tone="danger">Try refreshing.</Alert>

  const fields = data?.fields ?? []
  const collectionMutationError = createCollection.error || updateCollection.error

  return (
    <section className="space-y-8">
      <PageHeader
        title={isNew ? 'New collection' : `Edit: ${data?.displayName ?? ''}`}
        description={isNew ? 'Create a new content type.' : 'Update collection settings and fields.'}
        actions={
          <Link
            to="/admin/collections"
            className="inline-flex items-center justify-center gap-2 rounded-md font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-border bg-background hover:bg-muted h-8 px-2 text-xs"
          >
            Back to collections
          </Link>
        }
      />

      <form onSubmit={handleCollectionSubmit} className="space-y-4 max-w-lg">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic info</h2>

        {collectionMutationError && (
          <Alert title="Save failed" tone="danger">
            {collectionMutationError instanceof AdminApiError
              ? collectionMutationError.message
              : 'Unexpected error'}
          </Alert>
        )}
        {collectionSaved && (
          <Alert title="Saved" tone="success">Collection updated.</Alert>
        )}

        {isNew && (
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name <span className="text-muted-foreground text-xs">(lowercase, underscores only)</span></Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. blog_posts"
              required
              pattern="^[a-z0-9_]+$"
            />
          </div>
        )}

        {!isNew && (
          <div className="grid gap-1.5">
            <Label>Name</Label>
            <Input value={data?.name ?? ''} disabled />
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="e.g. Blog Posts"
            required
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={createCollection.isPending || updateCollection.isPending}>
            {createCollection.isPending || updateCollection.isPending ? 'Saving…' : isNew ? 'Create collection' : 'Save'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/admin/collections')}>
            Cancel
          </Button>
        </div>
      </form>

      {!isNew && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fields</h2>
            <Button type="button" size="sm" onClick={openAddField}>Add field</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Required</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center text-muted-foreground" colSpan={5}>
                    No fields yet. Add your first field.
                  </TableCell>
                </TableRow>
              ) : (
                fields.map(field => (
                  <TableRow key={field.id}>
                    <TableCell className="text-xs font-mono text-muted-foreground">{field.fieldName}</TableCell>
                    <TableCell className="font-medium">{field.fieldLabel}</TableCell>
                    <TableCell>
                      <Badge className="bg-muted text-muted-foreground">{field.fieldType}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {field.isRequired ? '✓' : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={() => openEditField(field)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs font-medium text-destructive hover:underline"
                          onClick={() => handleDeleteField(field)}
                        >
                          Delete
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {!isNew && !data?.managed && (
        <div className="border-t border-border pt-6">
          <p className="mb-3 text-sm font-medium text-destructive">Danger zone</p>
          {!confirmDelete ? (
            <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)}>
              Delete collection
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">This cannot be undone.</p>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteCollection.isPending}
                onClick={handleDeleteCollection}
              >
                {deleteCollection.isPending ? 'Deleting…' : 'Confirm delete'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          )}
          {deleteCollection.isError && (
            <Alert title="Delete failed" tone="danger" className="mt-3">
              {deleteCollection.error instanceof AdminApiError
                ? deleteCollection.error.message
                : 'Unexpected error'}
            </Alert>
          )}
        </div>
      )}

      <Dialog
        open={fieldDialogOpen}
        onClose={() => setFieldDialogOpen(false)}
        title={fieldDialogMode === 'add' ? 'Add field' : 'Edit field'}
      >
        <form onSubmit={handleFieldSubmit} className="space-y-4">
          {fieldError && (
            <Alert title="Error" tone="danger">{fieldError}</Alert>
          )}

          {fieldDialogMode === 'add' && (
            <div className="grid gap-1.5">
              <Label htmlFor="fieldName">Field name <span className="text-muted-foreground text-xs">(lowercase, underscores only)</span></Label>
              <Input
                id="fieldName"
                value={fieldForm.fieldName}
                onChange={e => setFieldForm(f => ({ ...f, fieldName: e.target.value }))}
                placeholder="e.g. published_at"
                required
                pattern="^[a-z0-9_]+$"
              />
            </div>
          )}

          {fieldDialogMode === 'edit' && (
            <div className="grid gap-1.5">
              <Label>Field name</Label>
              <Input value={fieldForm.fieldName} disabled />
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="fieldLabel">Label</Label>
            <Input
              id="fieldLabel"
              value={fieldForm.fieldLabel}
              onChange={e => setFieldForm(f => ({ ...f, fieldLabel: e.target.value }))}
              placeholder="e.g. Published At"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="fieldType">Type</Label>
            <select
              id="fieldType"
              value={fieldForm.fieldType}
              onChange={e => setFieldForm(f => ({ ...f, fieldType: e.target.value }))}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {ALL_FIELD_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={fieldForm.isRequired}
                onChange={e => setFieldForm(f => ({ ...f, isRequired: e.target.checked }))}
                className="rounded border-input"
              />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={fieldForm.isSearchable}
                onChange={e => setFieldForm(f => ({ ...f, isSearchable: e.target.checked }))}
                className="rounded border-input"
              />
              Searchable
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setFieldDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createField.isPending || updateField.isPending}
            >
              {createField.isPending || updateField.isPending
                ? 'Saving…'
                : fieldDialogMode === 'add' ? 'Add field' : 'Save field'}
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  )
}
