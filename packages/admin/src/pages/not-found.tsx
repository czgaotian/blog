import { PageHeader } from '../components/page-header'
import { Button } from '../components/ui/button'

export function NotFoundPage() {
  return (
    <section className="space-y-3">
      <PageHeader title="Page not found" description="This admin SPA route has not been migrated yet." />
      <Button asChild>
        <a href="/dashboard">Back to dashboard</a>
      </Button>
    </section>
  )
}
