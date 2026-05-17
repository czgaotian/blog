import { useState } from 'react'
import { useActivityLogs, activityLogsExportUrl, type ActivityLogsFilters } from '../api/profile'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { LoadingState } from '../components/ui/loading-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'

export function ActivityLogsPage() {
  const [filters, setFilters] = useState<ActivityLogsFilters>({ page: 1, limit: 50 })
  const [draftFilters, setDraftFilters] = useState({ action: '', resourceType: '', dateFrom: '', dateTo: '', userId: '' })
  const { data, isLoading, isError } = useActivityLogs(filters)

  function applyFilters(e: React.FormEvent) {
    e.preventDefault()
    setFilters({
      page: 1,
      limit: 50,
      action: draftFilters.action || undefined,
      resourceType: draftFilters.resourceType || undefined,
      dateFrom: draftFilters.dateFrom || undefined,
      dateTo: draftFilters.dateTo || undefined,
      userId: draftFilters.userId || undefined,
    })
  }

  function clearFilters() {
    setDraftFilters({ action: '', resourceType: '', dateFrom: '', dateTo: '', userId: '' })
    setFilters({ page: 1, limit: 50 })
  }

  const exportUrl = activityLogsExportUrl({
    action: filters.action,
    resourceType: filters.resourceType,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    userId: filters.userId,
  })

  return (
    <section className="space-y-6">
      <PageHeader
        title="Activity Logs"
        description="Audit trail of admin actions."
        actions={
          <a
            href={exportUrl}
            download
            className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
          >
            Export CSV
          </a>
        }
      />

      <form onSubmit={applyFilters} className="grid grid-cols-2 gap-4 max-w-2xl md:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="filterAction">Action</Label>
          <Input id="filterAction" value={draftFilters.action} onChange={e => setDraftFilters(f => ({ ...f, action: e.target.value }))} placeholder="e.g. content.create" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filterResourceType">Resource type</Label>
          <Input id="filterResourceType" value={draftFilters.resourceType} onChange={e => setDraftFilters(f => ({ ...f, resourceType: e.target.value }))} placeholder="e.g. content" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filterUserId">User ID</Label>
          <Input id="filterUserId" value={draftFilters.userId} onChange={e => setDraftFilters(f => ({ ...f, userId: e.target.value }))} placeholder="UUID" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filterDateFrom">From</Label>
          <Input id="filterDateFrom" type="date" value={draftFilters.dateFrom} onChange={e => setDraftFilters(f => ({ ...f, dateFrom: e.target.value }))} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filterDateTo">To</Label>
          <Input id="filterDateTo" type="date" value={draftFilters.dateTo} onChange={e => setDraftFilters(f => ({ ...f, dateTo: e.target.value }))} />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" size="sm">Filter</Button>
          <Button type="button" variant="outline" size="sm" onClick={clearFilters}>Clear</Button>
        </div>
      </form>

      {isLoading && <LoadingState label="Loading logs" />}

      {isError && (
        <Alert title="Failed to load logs" tone="danger">
          Could not fetch activity logs. Try refreshing.
        </Alert>
      )}

      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.logs.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center text-muted-foreground" colSpan={5}>
                    No logs found.
                  </TableCell>
                </TableRow>
              ) : (
                data.logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{log.userName ?? '—'}</div>
                      {log.userEmail && <div className="text-xs text-muted-foreground">{log.userEmail}</div>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.resourceType ? `${log.resourceType}${log.resourceId ? ` #${log.resourceId.slice(0, 8)}` : ''}` : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.ipAddress ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {data.pagination.pages > 1 && (
            <div className="flex items-center gap-3 justify-end text-sm">
              <Button
                type="button" variant="outline" size="sm"
                disabled={data.pagination.page <= 1}
                onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) - 1 }))}
              >
                Previous
              </Button>
              <span className="text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.pages}
              </span>
              <Button
                type="button" variant="outline" size="sm"
                disabled={data.pagination.page >= data.pagination.pages}
                onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) + 1 }))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
