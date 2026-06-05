import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useContentsVersions, useRestoreContentsVersion } from '../../api/contents'
import { AdminApiError } from '../../api/client'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { LoadingState } from '../ui/loading-state'
import { ConfirmDialog } from './confirm-dialog'

interface VersionHistoryProps {
  contentId: string
  onRestored: () => void
}

export function VersionHistory({ contentId, onRestored }: VersionHistoryProps) {
  const versions = useContentsVersions(contentId)
  const restore = useRestoreContentsVersion(contentId)
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)

  async function handleRestore() {
    if (selectedVersion === null) return
    try {
      await restore.mutateAsync(selectedVersion)
      setSelectedVersion(null)
      onRestored()
    } catch {
      // Mutation error is displayed below.
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Version history</CardTitle>
          <CardDescription>Restore a previous saved version of this content.</CardDescription>
        </CardHeader>
        <CardContent>
          {versions.isLoading ? <LoadingState label="Loading versions" /> : null}
          {versions.isError ? <Alert title="Could not load versions" tone="danger" /> : null}
          {restore.isError ? (
            <Alert title="Could not restore version" tone="danger">
              {restore.error instanceof AdminApiError ? restore.error.message : 'Unexpected error'}
            </Alert>
          ) : null}
          {versions.data?.versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved versions.</p>
          ) : null}
          {versions.data?.versions.length ? (
            <div className="flex flex-col divide-y divide-border">
              {versions.data.versions.map((version) => (
                <div key={version.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Version {version.version}{version.isCurrent ? ' · Current' : ''}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {version.authorName} · {new Date(version.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!version.isCurrent ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => setSelectedVersion(version.version)}>
                      <RotateCcw />
                      Restore
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={selectedVersion !== null}
        title="Restore content version?"
        confirmLabel="Restore version"
        pendingLabel="Restoring..."
        pending={restore.isPending}
        onCancel={() => setSelectedVersion(null)}
        onConfirm={handleRestore}
      >
        Restoring version {selectedVersion} will replace the current content fields and create a new version.
      </ConfirmDialog>
    </>
  )
}
