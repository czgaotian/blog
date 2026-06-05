import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useCreateContents } from '../api/contents'
import { AdminApiError } from '../api/client'
import { ContentForm } from '../components/content/content-form'
import { PageHeader } from '../components/page-header'
import { Button } from '../components/ui/button'
import {
  contentFormToCreateRequest,
  EMPTY_CONTENT_FORM_VALUES,
  type ContentFormValues,
} from '../lib/content-form'
import { useUnsavedChanges } from '../lib/use-unsaved-changes'

export function ContentCreatePage() {
  const navigate = useNavigate()
  const create = useCreateContents()
  const [dirty, setDirty] = useState(false)
  const handleDirtyChange = useCallback((value: boolean) => setDirty(value), [])
  const allowNavigation = useUnsavedChanges(dirty)

  async function handleSubmit(values: ContentFormValues) {
    try {
      const result = await create.mutateAsync(contentFormToCreateRequest(values))
      allowNavigation()
      navigate(`/contents/${result.id}`, { replace: true, state: { success: 'Content created' } })
    } catch {
      // Mutation error is displayed in the form.
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="New content"
        description="Create a new blog content item."
        actions={<Button asChild variant="outline"><Link to="/contents">Back to content</Link></Button>}
      />
      <ContentForm
        values={EMPTY_CONTENT_FORM_VALUES}
        submitLabel="Create content"
        pendingLabel="Creating..."
        pending={create.isPending}
        error={create.error instanceof AdminApiError ? create.error.message : create.isError ? 'Unexpected error' : undefined}
        onDirtyChange={handleDirtyChange}
        onSubmit={handleSubmit}
      />
    </section>
  )
}
