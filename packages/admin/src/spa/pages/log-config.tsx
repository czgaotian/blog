import { useLogConfig } from '../api/logs'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { LoadingState } from '../components/ui/loading-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'

export function LogConfigPage() {
  const { data, isLoading, isError } = useLogConfig()

  return (
    <section className="space-y-6">
      <PageHeader title="Log Configuration" description="Per-category logging settings." />

      {isLoading && <LoadingState label="Loading log config" />}

      {isError && (
        <Alert title="Failed to load log config" tone="danger">
          Could not fetch log configuration. Try refreshing the page.
        </Alert>
      )}

      {!isLoading && !isError && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Min level</TableHead>
              <TableHead>Retention (days)</TableHead>
              <TableHead>Max size</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.configs.length === 0 ? (
              <TableRow>
                <TableCell className="text-center text-muted-foreground" colSpan={5}>
                  No configuration found.
                </TableCell>
              </TableRow>
            ) : (
              data?.configs.map(config => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">{config.category}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        config.enabled
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-muted text-muted-foreground'
                      }
                    >
                      {config.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell>{config.level}</TableCell>
                  <TableCell>{config.retention}</TableCell>
                  <TableCell>{config.maxSize !== null ? config.maxSize : '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
