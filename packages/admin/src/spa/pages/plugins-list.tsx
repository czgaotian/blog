import { usePluginsList } from '../api/plugins'
import type { AdminPluginStatus } from '@worker-blog/shared/admin-api'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { LoadingState } from '../components/ui/loading-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'

const statusColors: Record<AdminPluginStatus, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  inactive: 'bg-muted text-muted-foreground',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  uninstalled: 'bg-muted text-muted-foreground opacity-60',
}

export function PluginsListPage() {
  const { data, isLoading, isError } = usePluginsList()

  return (
    <section className="space-y-6">
      <PageHeader title="Plugins" description="Manage installed plugins." />

      {isLoading && <LoadingState label="Loading plugins" />}

      {isError && (
        <Alert title="Failed to load plugins" tone="danger">
          Could not fetch plugins. Try refreshing the page.
        </Alert>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: 'Total', value: data.stats.total },
              { label: 'Active', value: data.stats.active },
              { label: 'Inactive', value: data.stats.inactive },
              { label: 'Errors', value: data.stats.error },
              { label: 'Uninstalled', value: data.stats.uninstalled },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plugin</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.plugins.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center text-muted-foreground" colSpan={5}>
                    No plugins found.
                  </TableCell>
                </TableRow>
              ) : (
                data.plugins.map(plugin => (
                  <TableRow key={plugin.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {plugin.icon && (
                          <span className="text-xl leading-none">{plugin.icon}</span>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium">{plugin.displayName}</p>
                          {plugin.description && (
                            <p className="truncate text-xs text-muted-foreground">{plugin.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{plugin.version}</TableCell>
                    <TableCell>
                      <Badge className="bg-muted text-muted-foreground">{plugin.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[plugin.status]}>{plugin.status}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(plugin.lastUpdated).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </>
      )}
    </section>
  )
}
