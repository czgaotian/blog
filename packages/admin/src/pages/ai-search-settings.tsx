import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { AISearchAdminDashboardData, PluginCollectionInfo } from '@worker-blog/shared/admin-api'
import { useAISearchAdmin, useTriggerAISearchIndex, useUpdateAISearchSettings } from '../api/ai-search'
import { AdminApiError } from '../api/client'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { LoadingState } from '../components/ui/loading-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'

function errorMessage(error: unknown): string {
  return error instanceof AdminApiError ? error.message : 'Unexpected error'
}

function StatusBadge({ status }: { status?: string }) {
  const tone = status === 'completed'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    : status === 'error'
      ? 'border-destructive/30 bg-destructive/10 text-destructive'
      : status === 'indexing'
        ? 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'
        : ''

  return <Badge className={tone}>{status || 'not indexed'}</Badge>
}

function SummaryCards({ data }: { data: AISearchAdminDashboardData }) {
  const indexedCount = data.collections.filter((collection) => collection.is_indexed).length
  const pendingCount = Object.values(data.indexStatus).filter((status) => status.status === 'indexing').length

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { label: 'Indexed collections', value: indexedCount },
        { label: 'Available collections', value: data.collections.length },
        { label: 'Active indexing jobs', value: pendingCount },
        { label: 'Search queries', value: data.analytics.total_queries },
      ].map(({ label, value }) => (
        <div key={label} className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
      ))}
    </div>
  )
}

function SettingsForm({ data }: { data: AISearchAdminDashboardData }) {
  const mutation = useUpdateAISearchSettings()
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaved(false)

    const form = new FormData(e.currentTarget)

    await mutation.mutateAsync({
      enabled: form.get('enabled') === 'on',
      ai_mode_enabled: form.get('ai_mode_enabled') === 'on',
      autocomplete_enabled: form.get('autocomplete_enabled') === 'on',
      index_media: form.get('index_media') === 'on',
      selected_collections: form.getAll('selected_collections').map(String),
      cache_duration: Number(form.get('cache_duration') || data.settings.cache_duration),
      results_limit: Number(form.get('results_limit') || data.settings.results_limit),
    })

    setSaved(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-border bg-card p-4">
      <div>
        <h2 className="text-sm font-medium">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Configure collection indexing and search behavior.</p>
      </div>

      {mutation.isError && (
        <Alert title="Save failed" tone="danger">
          {errorMessage(mutation.error)}
        </Alert>
      )}

      {saved && !mutation.isError && (
        <Alert title="Saved" tone="success">AI Search settings updated.</Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="results_limit">Results limit</Label>
          <Input id="results_limit" name="results_limit" type="number" min={1} defaultValue={data.settings.results_limit} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="cache_duration">Cache duration (hours)</Label>
          <Input id="cache_duration" name="cache_duration" type="number" min={0} defaultValue={data.settings.cache_duration} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['enabled', 'Search enabled', data.settings.enabled],
          ['ai_mode_enabled', 'AI mode', data.settings.ai_mode_enabled],
          ['autocomplete_enabled', 'Autocomplete', data.settings.autocomplete_enabled],
          ['index_media', 'Index media', data.settings.index_media],
        ].map(([name, label, checked]) => (
          <label key={String(name)} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
            <input name={String(name)} type="checkbox" defaultChecked={Boolean(checked)} className="h-4 w-4 rounded border-input" />
            {label}
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <Label>Collections</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {data.collections.map((collection) => (
            <label key={collection.id} className="flex items-start gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <input
                name="selected_collections"
                type="checkbox"
                value={collection.id}
                defaultChecked={data.settings.selected_collections.includes(collection.id)}
                className="mt-0.5 h-4 w-4 rounded border-input"
              />
              <span className="min-w-0">
                <span className="block truncate font-medium">{collection.display_name}</span>
                <span className="block truncate text-xs text-muted-foreground">{collection.name}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Save settings'}
      </Button>
    </form>
  )
}

function CollectionRow({ collection, data }: { collection: PluginCollectionInfo; data: AISearchAdminDashboardData }) {
  const mutation = useTriggerAISearchIndex()
  const status = data.indexStatus[collection.id]

  return (
    <TableRow>
      <TableCell>
        <div className="min-w-0">
          <p className="truncate font-medium">{collection.display_name}</p>
          <p className="truncate text-xs text-muted-foreground">{collection.name}</p>
        </div>
      </TableCell>
      <TableCell>{collection.item_count ?? 0}</TableCell>
      <TableCell>
        <StatusBadge status={status?.status} />
      </TableCell>
      <TableCell>{status ? `${status.indexed_items}/${status.total_items}` : '-'}</TableCell>
      <TableCell className="text-right">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate({ collection_id: collection.id })}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {mutation.isPending ? 'Starting...' : 'Index'}
        </Button>
      </TableCell>
    </TableRow>
  )
}

function CollectionsTable({ data }: { data: AISearchAdminDashboardData }) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">Collections</h2>
        <p className="mt-1 text-sm text-muted-foreground">Review index status and start indexing jobs.</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Collection</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Indexed</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.collections.map((collection) => (
            <CollectionRow key={collection.id} collection={collection} data={data} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function AISearchSettingsPage() {
  const { data, isLoading, isError, error } = useAISearchAdmin()

  return (
    <section className="space-y-6">
      <PageHeader title="AI Search" description="Manage collection indexing, AI search behavior, and search analytics." />

      {isLoading && <LoadingState label="Loading AI Search" />}

      {isError && (
        <Alert title="Failed to load AI Search" tone="danger">
          {errorMessage(error)}
        </Alert>
      )}

      {data && (
        <>
          {data.newCollections.length > 0 && (
            <Alert title="New collections" tone="info">
              {data.newCollections.length} collection{data.newCollections.length === 1 ? '' : 's'} can be added to the search index.
            </Alert>
          )}
          <SummaryCards data={data} />
          <SettingsForm data={data} />
          <CollectionsTable data={data} />
        </>
      )}
    </section>
  )
}
