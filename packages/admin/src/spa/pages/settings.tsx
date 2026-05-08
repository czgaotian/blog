import { useState } from 'react'
import { useSettings, useUpdateGeneralSettings, useUpdateSecuritySettings } from '../api/settings'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'
import { LoadingState } from '../components/ui/loading-state'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import { AdminApiError } from '../api/client'

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function GeneralTab() {
  const { data, isLoading, isError } = useSettings()
  const mutation = useUpdateGeneralSettings()
  const [saved, setSaved] = useState(false)

  if (isLoading) return <LoadingState label="Loading settings" />
  if (isError) return <Alert title="Failed to load settings" tone="danger">Try refreshing the page.</Alert>
  if (!data) return null

  const g = data.general

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaved(false)
    const form = new FormData(e.currentTarget)
    await mutation.mutateAsync({
      siteName: String(form.get('siteName') || ''),
      siteDescription: String(form.get('siteDescription') || ''),
      adminEmail: String(form.get('adminEmail') || ''),
      timezone: String(form.get('timezone') || 'UTC'),
      language: String(form.get('language') || 'en'),
      maintenanceMode: form.get('maintenanceMode') === 'on',
    })
    setSaved(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {mutation.isError && (
        <Alert title="Save failed" tone="danger">
          {mutation.error instanceof AdminApiError ? mutation.error.message : 'Unexpected error'}
        </Alert>
      )}
      {saved && !mutation.isError && (
        <Alert title="Saved" tone="success">General settings updated.</Alert>
      )}
      <FieldRow label="Site name">
        <Input name="siteName" defaultValue={g.siteName} required />
      </FieldRow>
      <FieldRow label="Site description">
        <Input name="siteDescription" defaultValue={g.siteDescription} required />
      </FieldRow>
      <FieldRow label="Admin email">
        <Input name="adminEmail" type="email" defaultValue={g.adminEmail} required />
      </FieldRow>
      <FieldRow label="Timezone">
        <Input name="timezone" defaultValue={g.timezone} />
      </FieldRow>
      <FieldRow label="Language">
        <Input name="language" defaultValue={g.language} />
      </FieldRow>
      <div className="flex items-center gap-2">
        <input
          id="maintenanceMode"
          name="maintenanceMode"
          type="checkbox"
          defaultChecked={g.maintenanceMode}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="maintenanceMode">Maintenance mode</Label>
      </div>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving…' : 'Save'}
      </Button>
    </form>
  )
}

function SecurityTab() {
  const { data, isLoading, isError } = useSettings()
  const mutation = useUpdateSecuritySettings()
  const [saved, setSaved] = useState(false)

  if (isLoading) return <LoadingState label="Loading settings" />
  if (isError) return <Alert title="Failed to load settings" tone="danger">Try refreshing the page.</Alert>
  if (!data) return null

  const s = data.security

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaved(false)
    const form = new FormData(e.currentTarget)
    await mutation.mutateAsync({
      jwtExpiresIn: String(form.get('jwtExpiresIn') || '7d'),
      jwtRefreshGraceSeconds: Number(form.get('jwtRefreshGraceSeconds') || 0),
    })
    setSaved(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {mutation.isError && (
        <Alert title="Save failed" tone="danger">
          {mutation.error instanceof AdminApiError ? mutation.error.message : 'Unexpected error'}
        </Alert>
      )}
      {saved && !mutation.isError && (
        <Alert title="Saved" tone="success">Security settings updated.</Alert>
      )}
      <FieldRow label="JWT expires in (e.g. 7d, 24h, 3600)">
        <Input name="jwtExpiresIn" defaultValue={s.jwtExpiresIn} required />
      </FieldRow>
      <FieldRow label="JWT refresh grace (seconds)">
        <Input name="jwtRefreshGraceSeconds" type="number" min={0} defaultValue={s.jwtRefreshGraceSeconds} required />
      </FieldRow>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving…' : 'Save'}
      </Button>
    </form>
  )
}

const TABS = ['general', 'security'] as const
type Tab = (typeof TABS)[number]

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('general')

  return (
    <section className="space-y-6">
      <PageHeader title="Settings" description="Manage site and security configuration." />

      <div className="flex gap-1 border-b border-border">
        {TABS.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={[
              'px-4 py-2 text-sm font-medium capitalize transition-colors',
              tab === t
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'general' && <GeneralTab />}
      {tab === 'security' && <SecurityTab />}
    </section>
  )
}
