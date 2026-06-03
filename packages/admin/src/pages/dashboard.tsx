import { useDashboard } from '../api/dashboard'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { LoadingState } from '../components/ui/loading-state'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboard()

  return (
    <section className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of your blog." />

      {isLoading && <LoadingState label="Loading dashboard" />}

      {isError && (
        <Alert title="Failed to load dashboard" tone="danger">
          Could not fetch dashboard data. Try refreshing the page.
        </Alert>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Content items', value: data.stats.contentItems },
              { label: 'Media files', value: data.stats.mediaFiles },
              { label: 'Users', value: data.stats.users },
              { label: 'Media size', value: formatBytes(data.stats.mediaSize) },
              { label: 'DB size', value: formatBytes(data.stats.databaseSize) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-medium">Recent activity</h2>
            </div>
            {data.recentActivity.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.recentActivity.map(item => (
                  <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{item.description}</p>
                      <p className="text-xs text-muted-foreground">{item.user}</p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-medium">Live metrics</h2>
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Requests/sec</p>
                <p className="text-lg font-semibold">{data.metrics.requestsPerSecond.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total requests</p>
                <p className="text-lg font-semibold">{data.metrics.totalRequests}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg RPS</p>
                <p className="text-lg font-semibold">{data.metrics.averageRPS.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
