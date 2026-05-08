import { Link, useParams } from 'react-router'
import { useLogDetails } from '../api/logs'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { LoadingState } from '../components/ui/loading-state'

const levelColors: Record<string, string> = {
  debug: 'bg-muted text-muted-foreground',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  warn: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  fatal: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
}

export function LogDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = useLogDetails(id ?? '')

  const log = data?.log

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <Link className="text-sm text-muted-foreground hover:underline" to="/admin/logs">
          ← Back to logs
        </Link>
      </div>

      <PageHeader title="Log Entry" description={id} />

      {isLoading && <LoadingState label="Loading log entry" />}

      {isError && (
        <Alert title="Failed to load log entry" tone="danger">
          Could not fetch log details. Try refreshing the page.
        </Alert>
      )}

      {log && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge className={levelColors[log.level] ?? 'bg-muted text-muted-foreground'}>
              {log.level}
            </Badge>
            <Badge className="bg-muted text-muted-foreground">{log.category}</Badge>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="font-medium">{log.message}</p>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-medium">Details</h2>
            </div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 p-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Time</dt>
                <dd className="text-sm">{new Date(log.createdAt).toLocaleString()}</dd>
              </div>
              {log.source !== null && (
                <div>
                  <dt className="text-xs text-muted-foreground">Source</dt>
                  <dd className="text-sm">{log.source}</dd>
                </div>
              )}
              {log.method !== null && (
                <div>
                  <dt className="text-xs text-muted-foreground">Method</dt>
                  <dd className="text-sm">{log.method}</dd>
                </div>
              )}
              {log.url !== null && (
                <div>
                  <dt className="text-xs text-muted-foreground">URL</dt>
                  <dd className="break-all text-sm">{log.url}</dd>
                </div>
              )}
              {log.statusCode !== null && (
                <div>
                  <dt className="text-xs text-muted-foreground">Status</dt>
                  <dd className="text-sm">{log.statusCode}</dd>
                </div>
              )}
              {log.duration !== null && (
                <div>
                  <dt className="text-xs text-muted-foreground">Duration</dt>
                  <dd className="text-sm">{log.duration}ms</dd>
                </div>
              )}
              {log.ipAddress !== null && (
                <div>
                  <dt className="text-xs text-muted-foreground">IP</dt>
                  <dd className="text-sm">{log.ipAddress}</dd>
                </div>
              )}
              {log.userId !== null && (
                <div>
                  <dt className="text-xs text-muted-foreground">User ID</dt>
                  <dd className="text-sm">{log.userId}</dd>
                </div>
              )}
            </dl>
          </div>

          {log.tags.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-medium">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {log.tags.map(tag => (
                  <Badge key={tag} className="bg-muted text-muted-foreground">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {log.data !== null && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-medium">Data</h2>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(log.data, null, 2)}
              </pre>
            </div>
          )}

          {log.stackTrace !== null && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-medium">Stack trace</h2>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{log.stackTrace}</pre>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
