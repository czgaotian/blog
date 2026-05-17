import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { StripeAdminDashboardData } from '@worker-blog/shared/admin-api'
import { useStripeAdmin, useSyncStripeSubscriptions } from '../api/stripe'
import { AdminApiError } from '../api/client'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { LoadingState } from '../components/ui/loading-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'

type Tab = 'subscriptions' | 'events'

function errorMessage(error: unknown): string {
  return error instanceof AdminApiError ? error.message : 'Unexpected error'
}

function formatUnix(seconds: number): string {
  if (!seconds) return '-'
  return new Date(seconds * 1000).toLocaleString()
}

function StatusBadge({ children }: { children: React.ReactNode }) {
  return <Badge className="capitalize">{children}</Badge>
}

function SummaryCards({ data }: { data: StripeAdminDashboardData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { label: 'Subscriptions', value: data.subscriptionStats.total },
        { label: 'Active', value: data.subscriptionStats.active },
        { label: 'Past due', value: data.subscriptionStats.pastDue },
        { label: 'Webhook events', value: data.eventStats.total },
      ].map(({ label, value }) => (
        <div key={label} className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
      ))}
    </div>
  )
}

function SubscriptionsTable({ data }: { data: StripeAdminDashboardData }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Subscription</TableHead>
          <TableHead>Current period</TableHead>
          <TableHead>Canceling</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.subscriptions.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">No subscriptions found.</TableCell>
          </TableRow>
        ) : (
          data.subscriptions.map((subscription) => (
            <TableRow key={subscription.id}>
              <TableCell>
                <div className="min-w-0">
                  <p className="truncate font-medium">{subscription.userEmail || subscription.userId || 'Unassigned'}</p>
                  <p className="truncate text-xs text-muted-foreground">{subscription.stripeCustomerId}</p>
                </div>
              </TableCell>
              <TableCell><StatusBadge>{subscription.status.replace('_', ' ')}</StatusBadge></TableCell>
              <TableCell className="max-w-56 truncate">{subscription.stripeSubscriptionId}</TableCell>
              <TableCell>{formatUnix(subscription.currentPeriodEnd)}</TableCell>
              <TableCell>{subscription.cancelAtPeriodEnd ? 'Yes' : 'No'}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

function EventsTable({ data }: { data: StripeAdminDashboardData }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Event</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Object</TableHead>
          <TableHead>Processed</TableHead>
          <TableHead>Error</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.events.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">No events found.</TableCell>
          </TableRow>
        ) : (
          data.events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="max-w-64 truncate">{event.type}</TableCell>
              <TableCell><StatusBadge>{event.status}</StatusBadge></TableCell>
              <TableCell className="max-w-48 truncate">{event.objectId || event.objectType || '-'}</TableCell>
              <TableCell>{formatUnix(event.processedAt)}</TableCell>
              <TableCell className="max-w-56 truncate text-destructive">{event.error || '-'}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

export function StripePage() {
  const { data, isLoading, isError, error } = useStripeAdmin()
  const syncMutation = useSyncStripeSubscriptions()
  const [tab, setTab] = useState<Tab>('subscriptions')

  return (
    <section className="space-y-6">
      <PageHeader
        title="Stripe"
        description="Manage subscriptions, webhook events, and Stripe synchronization."
        actions={(
          <Button type="button" variant="outline" disabled={syncMutation.isPending} onClick={() => syncMutation.mutate()}>
            <RefreshCw className="h-4 w-4" />
            {syncMutation.isPending ? 'Syncing...' : 'Sync'}
          </Button>
        )}
      />

      {isLoading && <LoadingState label="Loading Stripe" />}

      {isError && (
        <Alert title="Failed to load Stripe" tone="danger">
          {errorMessage(error)}
        </Alert>
      )}

      {syncMutation.isError && (
        <Alert title="Sync failed" tone="danger">
          {errorMessage(syncMutation.error)}
        </Alert>
      )}

      {data && !data.configured && (
        <Alert title="Stripe is not fully configured" tone="info">
          Configure the Stripe secret key and webhook secret before syncing live subscriptions.
        </Alert>
      )}

      {syncMutation.isSuccess && (
        <Alert title="Sync complete" tone="success">
          Synced {syncMutation.data.synced} of {syncMutation.data.total} subscriptions with {syncMutation.data.errors} errors.
        </Alert>
      )}

      {data && (
        <>
          <SummaryCards data={data} />

          <div className="flex gap-1 border-b border-border">
            {(['subscriptions', 'events'] as const).map((item) => (
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

          {tab === 'subscriptions' ? <SubscriptionsTable data={data} /> : <EventsTable data={data} />}
        </>
      )}
    </section>
  )
}
