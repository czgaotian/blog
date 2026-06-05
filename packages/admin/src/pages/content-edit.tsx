import { useCallback, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Trash2 } from 'lucide-react'
import { useContentsDetail, useDeleteContents, useUpdateContents } from '../api/contents'
import { AdminApiError } from '../api/client'
import { ConfirmDialog } from '../components/content/confirm-dialog'
import { ContentForm } from '../components/content/content-form'
import { VersionHistory } from '../components/content/version-history'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { LoadingState } from '../components/ui/loading-state'
import {
  contentFormToUpdateRequest,
  detailToContentFormValues,
  type ContentFormValues,
} from '../lib/content-form'
import { useUnsavedChanges } from '../lib/use-unsaved-changes'

export function ContentEditPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const detail = useContentsDetail(id)
  const update = useUpdateContents(id)
  const remove = useDeleteContents(id)
  const [dirty, setDirty] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [success, setSuccess] = useState<string | undefined>(
    (location.state as { success?: string } | null)?.success,
  )
  const values = useMemo(() => detail.data ? detailToContentFormValues(detail.data) : null, [detail.data])
  const handleDirtyChange = useCallback((value: boolean) => setDirty(value), [])
  const allowNavigation = useUnsavedChanges(dirty)

  async function handleSubmit(formValues: ContentFormValues) {
    if (!detail.data) return
    setSuccess(undefined)
    try {
      await update.mutateAsync(contentFormToUpdateRequest(formValues, detail.data.metadata))
      setSuccess('Content saved')
      await detail.refetch()
    } catch {
      // Mutation error is displayed in the form.
    }
  }

  async function handleDelete() {
    try {
      await remove.mutateAsync()
      allowNavigation()
      navigate('/contents', { replace: true })
    } catch {
      // Mutation error is displayed in the dialog.
    }
  }

  if (detail.isLoading) return <LoadingState label="Loading content" />
  if (detail.isError || !detail.data || !values) {
    return (
      <Alert title="Content not found" tone="danger">
        The requested content could not be loaded. <Link className="underline" to="/contents">Return to content</Link>.
      </Alert>
    )
  }
  const content = detail.data

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={content.title}
        description={`Last updated ${new Date(content.updatedAt).toLocaleString()} by ${content.authorName}.`}
        actions={
          <>
            <Button asChild variant="outline"><Link to="/contents">Back to content</Link></Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 />Delete</Button>
          </>
        }
      />
      <ContentForm
        values={values}
        submitLabel="Save changes"
        pendingLabel="Saving..."
        pending={update.isPending}
        error={update.error instanceof AdminApiError ? update.error.message : update.isError ? 'Unexpected error' : undefined}
        success={success}
        onDirtyChange={handleDirtyChange}
        onSubmit={handleSubmit}
      />
      <VersionHistory contentId={id} onRestored={() => detail.refetch()} />
      <ConfirmDialog
        open={deleteOpen}
        title="Delete content?"
        confirmLabel="Delete content"
        pendingLabel="Deleting..."
        destructive
        pending={remove.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      >
        {remove.isError ? (
          <Alert title="Could not delete content" tone="danger">
            {remove.error instanceof AdminApiError ? remove.error.message : 'Unexpected error'}
          </Alert>
        ) : (
          <>“{content.title}” will be moved to the deleted content view.</>
        )}
      </ConfirmDialog>
    </section>
  )
}
