import { useState } from 'react'
import { ShieldCheck, Trash2 } from 'lucide-react'
import type { SecurityAuditAdminDashboardData } from '@worker-blog/shared/admin-api'
import {
  usePurgeSecurityAuditEvents,
  useReleaseSecurityAuditLockout,
  useSecurityAuditAdmin,
} from '../api/security-audit'
import { AdminApiError } from '../api/client'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { LoadingState } from '../components/ui/loading-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'

type Tab = 'events' | 'ips' | 'lockouts' | 'settings'

function errorMessage(error: unknown): string {
  return error instanceof AdminApiError ? error.message : 'Unexpected error'
}

function formatTime(timestamp: number): string {
  if (!timestamp) return '-'
  const ms = timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp
  return new Date(ms).toLocaleString()
}

function SeverityBadge({ severity }: { severity: string }) {
  const classes = severity === 'critical'
    ? 'border-destructive/30 bg-destructive/10 text-destructive'
    : severity === 'warning'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
      : ''

  return <Badge className={classes}>{severity}</Badge>
}

function SummaryCards({ data }: { data: SecurityAuditAdminDashboardData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { label: 'Total events', value: data.stats.totalEvents },
        { label: 'Failed logins 24h', value: data.stats.failedLogins24h },
        { label: 'Active lockouts', value: data.stats.activeLockouts },
        { label: 'Flagged IPs', value: data.stats.flaggedIPs },
      ].map(({ label, value }) => (
        <div key={label} className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
      ))}
    </div>
  )
}

function EventsTable({ data }: { data: SecurityAuditAdminDashboardData }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Event</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>IP</TableHead>
          <TableHead>Path</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.events.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">No security events found.</TableCell>
          </TableRow>
        ) : (
          data.events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="max-w-48 truncate">{event.eventType.replaceAll('_', ' ')}</TableCell>
              <TableCell><SeverityBadge severity={event.severity} /></TableCell>
              <TableCell className="max-w-48 truncate">{event.email || '-'}</TableCell>
              <TableCell>{event.ipAddress || '-'}</TableCell>
              <TableCell className="max-w-48 truncate">{event.requestPath || '-'}</TableCell>
              <TableCell>{formatTime(event.createdAt)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

function TopIPsTable({ data }: { data: SecurityAuditAdminDashboardData }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>IP address</TableHead>
          <TableHead>Country</TableHead>
          <TableHead>Failed attempts</TableHead>
          <TableHead>Last seen</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.topIPs.map((ip) => (
          <TableRow key={ip.ipAddress}>
            <TableCell>{ip.ipAddress}</TableCell>
            <TableCell>{ip.countryCode || '-'}</TableCell>
            <TableCell>{ip.failedAttempts}</TableCell>
            <TableCell>{formatTime(ip.lastSeen)}</TableCell>
            <TableCell>{ip.locked ? <Badge className="text-destructive">Locked</Badge> : <Badge>Watching</Badge>}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function LockoutsTable({ data }: { data: SecurityAuditAdminDashboardData }) {
  const mutation = useReleaseSecurityAuditLockout()

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Locked at</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.lockouts.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">No active lockouts.</TableCell>
          </TableRow>
        ) : (
          data.lockouts.map((lockout) => (
            <TableRow key={lockout.key}>
              <TableCell className="uppercase">{lockout.type}</TableCell>
              <TableCell>{lockout.value}</TableCell>
              <TableCell>{formatTime(lockout.lockedAt)}</TableCell>
              <TableCell className="text-right">
                <Button type="button" size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate(lockout.key)}>
                  Release
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

function SettingsPanel({ data }: { data: SecurityAuditAdminDashboardData }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium">Retention</h2>
        <p className="mt-3 text-sm text-muted-foreground">{data.settings.retention.daysToKeep} days retained</p>
        <p className="text-sm text-muted-foreground">{data.settings.retention.maxEvents.toLocaleString()} max events</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium">Brute force</h2>
        <p className="mt-3 text-sm text-muted-foreground">{data.settings.bruteForce.maxFailedAttemptsPerEmail} failures per email</p>
        <p className="text-sm text-muted-foreground">{data.settings.bruteForce.lockoutDurationMinutes} minute lockout</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium">Logging</h2>
        <p className="mt-3 text-sm text-muted-foreground">Successful logins: {data.settings.logging.logSuccessfulLogins ? 'On' : 'Off'}</p>
        <p className="text-sm text-muted-foreground">Permission denied: {data.settings.logging.logPermissionDenied ? 'On' : 'Off'}</p>
      </div>
    </div>
  )
}

export function SecurityAuditPage() {
  const { data, isLoading, isError, error } = useSecurityAuditAdmin()
  const purgeMutation = usePurgeSecurityAuditEvents()
  const [tab, setTab] = useState<Tab>('events')

  return (
    <section className="space-y-6">
      <PageHeader
        title="Security Audit"
        description="Monitor authentication events, suspicious activity, and active lockouts."
        actions={(
          <Button type="button" variant="outline" disabled={purgeMutation.isPending} onClick={() => purgeMutation.mutate(undefined)}>
            <Trash2 className="size-4" />
            {purgeMutation.isPending ? 'Purging...' : 'Purge old'}
          </Button>
        )}
      />

      {isLoading && <LoadingState label="Loading security audit" />}

      {isError && (
        <Alert title="Failed to load Security Audit" tone="danger">
          {errorMessage(error)}
        </Alert>
      )}

      {purgeMutation.isError && (
        <Alert title="Purge failed" tone="danger">
          {errorMessage(purgeMutation.error)}
        </Alert>
      )}

      {purgeMutation.isSuccess && (
        <Alert title="Purge complete" tone="success">
          Deleted {purgeMutation.data.deleted} old security events.
        </Alert>
      )}

      {data && (
        <>
          {data.recentCritical.length > 0 && (
            <Alert title="Critical activity" tone="danger">
              {data.recentCritical.length} critical security event{data.recentCritical.length === 1 ? '' : 's'} need review.
            </Alert>
          )}

          <SummaryCards data={data} />

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="size-4" />
              Last 24 hours
            </h2>
            <div className="flex h-24 items-end gap-1">
              {data.hourlyTrend.map((bucket) => (
                <div
                  key={bucket.hour}
                  title={`${bucket.hour}: ${bucket.count}`}
                  className="min-h-1 flex-1 rounded-t bg-primary/70"
                  style={{ height: `${Math.max(4, Math.min(100, bucket.count * 6))}%` }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-1 border-b border-border">
            {(['events', 'ips', 'lockouts', 'settings'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={[
                  'px-4 py-2 text-sm font-medium capitalize transition-colors',
                  tab === item
                    ? 'border-b-2 border-primary text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {item}
              </button>
            ))}
          </div>

          {tab === 'events' && <EventsTable data={data} />}
          {tab === 'ips' && <TopIPsTable data={data} />}
          {tab === 'lockouts' && <LockoutsTable data={data} />}
          {tab === 'settings' && <SettingsPanel data={data} />}
        </>
      )}
    </section>
  )
}
