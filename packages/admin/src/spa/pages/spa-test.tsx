import { useQuery } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { adminApi } from '../api/query'
import { PageHeader } from '../components/page-header'
import { Alert } from '../components/ui/alert'

export function SpaTestPage() {
  const meQuery = useQuery({
    queryKey: ['admin', 'me'],
    queryFn: adminApi.me,
  })

  return (
    <section className="space-y-4">
      <PageHeader title="SPA Test" description="React is handling this admin route." />

      <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Admin shell loaded</p>
            <p className="text-sm text-muted-foreground">
              {meQuery.data ? `Signed in as ${meQuery.data.user.email}` : 'Checking session'}
            </p>
          </div>
        </div>
      </div>

      {meQuery.isError ? (
        <Alert title="Session check failed" tone="danger">
          The shell loaded, but `/admin/api/me` did not return bootstrap data.
        </Alert>
      ) : null}
    </section>
  )
}
