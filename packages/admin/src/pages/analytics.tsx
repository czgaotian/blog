import { useAnalyticsAdmin } from '../api/analytics'
import { AdminApiError } from '../api/client'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { LoadingState } from '../components/ui/loading-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'

function errorMessage(error: unknown): string {
  return error instanceof AdminApiError ? error.message : 'Unexpected error'
}

function formatTime(timestamp: number): string {
  if (!timestamp) return '-'
  const ms = timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp
  return new Date(ms).toLocaleString()
}

export function AnalyticsPage() {
  const { data, isLoading, isError, error } = useAnalyticsAdmin()

  return (
    <section className="space-y-6">
      <PageHeader title="Analytics" description="Review request activity and tracked product events from the last 24 hours." />

      {isLoading && <LoadingState label="Loading analytics" />}

      {isError && (
        <Alert title="Failed to load Analytics" tone="danger">
          {errorMessage(error)}
        </Alert>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Requests', value: data.systemStats.totalRequests },
              { label: 'Unique IPs', value: data.systemStats.uniqueIPs },
              { label: 'Avg duration', value: `${data.systemStats.avgDuration}ms` },
              { label: 'Tracked events', value: data.eventStats.totalEvents },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-sm font-medium">Top pages</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Path</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topPages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">No page views recorded.</TableCell>
                    </TableRow>
                  ) : data.topPages.map((page) => (
                    <TableRow key={page.path}>
                      <TableCell className="max-w-80 truncate font-mono text-xs">{page.path}</TableCell>
                      <TableCell className="text-right">{page.views}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-medium">Top events</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.eventStats.topEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">No events tracked.</TableCell>
                    </TableRow>
                  ) : data.eventStats.topEvents.map((event) => (
                    <TableRow key={event.event}>
                      <TableCell className="max-w-80 truncate">{event.event}</TableCell>
                      <TableCell className="text-right">{event.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-medium">Recent request activity</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Path</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentActivity.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">No recent request activity.</TableCell>
                  </TableRow>
                ) : data.recentActivity.map((activity, index) => (
                  <TableRow key={`${activity.url}-${activity.created_at}-${index}`}>
                    <TableCell className="max-w-96 truncate font-mono text-xs">{activity.url || '-'}</TableCell>
                    <TableCell><Badge>{activity.method || '-'}</Badge></TableCell>
                    <TableCell>{activity.status_code || '-'}</TableCell>
                    <TableCell>{activity.duration || 0}ms</TableCell>
                    <TableCell>{formatTime(activity.created_at)}</TableCell>
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
