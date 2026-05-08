import { useState } from 'react'
import { useParams, Link } from 'react-router'
import { usePluginSettings, useUpdatePluginSettings } from '../api/plugin-settings'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { LoadingState } from '../components/ui/loading-state'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { AdminApiError } from '../api/client'
import type { PluginSettingField } from '@worker-blog/shared/admin-api'

function SettingField({
  field,
  value,
  onChange,
}: {
  field: PluginSettingField
  value: unknown
  onChange: (key: string, val: unknown) => void
}) {
  const strVal = value !== undefined && value !== null ? String(value) : ''

  switch (field.type) {
    case 'boolean':
      return (
        <div className="flex items-center gap-2">
          <input
            id={field.key}
            type="checkbox"
            checked={Boolean(value)}
            onChange={e => onChange(field.key, e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor={field.key}>{field.label}</Label>
          {field.description && (
            <span className="text-xs text-muted-foreground">— {field.description}</span>
          )}
        </div>
      )
    case 'select':
      return (
        <div className="grid gap-1.5">
          <Label htmlFor={field.key}>{field.label}</Label>
          <select
            id={field.key}
            value={strVal}
            onChange={e => onChange(field.key, e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {(field.options || []).map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
        </div>
      )
    case 'textarea':
      return (
        <div className="grid gap-1.5">
          <Label htmlFor={field.key}>{field.label}</Label>
          <textarea
            id={field.key}
            value={strVal}
            onChange={e => onChange(field.key, e.target.value)}
            rows={4}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
        </div>
      )
    default:
      return (
        <div className="grid gap-1.5">
          <Label htmlFor={field.key}>{field.label}</Label>
          <Input
            id={field.key}
            type={field.type === 'number' ? 'number' : 'text'}
            value={strVal}
            onChange={e => onChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
          />
          {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
        </div>
      )
  }
}

export function PluginSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = usePluginSettings(id!)
  const mutation = useUpdatePluginSettings(id!)
  const [localSettings, setLocalSettings] = useState<Record<string, unknown> | null>(null)
  const [saved, setSaved] = useState(false)

  const settings = localSettings ?? data?.settings ?? {}

  function handleChange(key: string, val: unknown) {
    setSaved(false)
    setLocalSettings(prev => ({ ...(prev ?? data?.settings ?? {}), [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    await mutation.mutateAsync({ settings })
    setSaved(true)
  }

  if (isLoading) return <LoadingState label="Loading plugin settings" />
  if (isError) return <Alert title="Failed to load plugin settings" tone="danger">Try refreshing the page.</Alert>
  if (!data) return null

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/admin/plugins" className="text-sm text-muted-foreground hover:text-foreground">
          ← Plugins
        </Link>
      </div>

      <PageHeader
        title={data.displayName}
        description={data.description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <Badge className="bg-muted text-muted-foreground">{data.status}</Badge>
            <span className="text-xs text-muted-foreground">v{data.version}</span>
          </div>
        }
      />

      {data.schema.length === 0 ? (
        <p className="text-sm text-muted-foreground">This plugin has no configurable settings.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          {mutation.isError && (
            <Alert title="Save failed" tone="danger">
              {mutation.error instanceof AdminApiError ? mutation.error.message : 'Unexpected error'}
            </Alert>
          )}
          {saved && !mutation.isError && (
            <Alert title="Saved" tone="success">Plugin settings updated.</Alert>
          )}

          {data.schema.map(field => (
            <SettingField
              key={field.key}
              field={field}
              value={settings[field.key] ?? field.defaultValue}
              onChange={handleChange}
            />
          ))}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        </form>
      )}
    </section>
  )
}
