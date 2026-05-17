import { useWorkflowAdmin } from '../api/workflow'
import { AdminApiError } from '../api/client'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { LoadingState } from '../components/ui/loading-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'

function errorMessage(error: unknown): string {
  return error instanceof AdminApiError ? error.message : 'Unexpected error'
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

export function WorkflowPage() {
  const { data, isLoading, isError, error } = useWorkflowAdmin()

  return (
    <section className="space-y-6">
      <PageHeader title="Workflow" description="Review workflow states, assignments, and scheduled content." />

      {isLoading && <LoadingState label="Loading workflow" />}

      {isError && (
        <Alert title="Failed to load Workflow" tone="danger">
          {errorMessage(error)}
        </Alert>
      )}

      {data && data.states.length === 0 && (
        <Alert title="No workflow data" tone="info">
          Workflow tables may not be migrated or no workflow states have been configured yet.
        </Alert>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'States', value: data.states.length },
              { label: 'Assigned to you', value: data.assignedContent.length },
              { label: 'Scheduled pending', value: data.scheduledStats.pending },
              { label: 'Scheduled failed', value: data.scheduledStats.failed },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-medium">Workflow states</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {data.states.map((state) => (
                <div key={state.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-medium">{state.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{state.description || state.id}</p>
                    </div>
                    <Badge>{state.count}</Badge>
                  </div>
                  {state.content.length > 0 ? (
                    <ul className="mt-3 divide-y divide-border">
                      {state.content.map((item, index) => (
                        <li key={formatValue(item.id) || index} className="py-2 text-sm">
                          <p className="truncate">{formatValue(item.title || item.slug || item.id)}</p>
                          <p className="truncate text-xs text-muted-foreground">{formatValue(item.collection_name)}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">No content in this state.</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-medium">Scheduled content</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>Collection</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.scheduledContent.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">No scheduled content.</TableCell>
                  </TableRow>
                ) : data.scheduledContent.map((item, index) => (
                  <TableRow key={formatValue(item.id) || index}>
                    <TableCell className="max-w-80 truncate">{formatValue(item.title || item.content_id)}</TableCell>
                    <TableCell>{formatValue(item.collection_name)}</TableCell>
                    <TableCell>{formatValue(item.action)}</TableCell>
                    <TableCell><Badge>{formatValue(item.status)}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </section>
  )
}
