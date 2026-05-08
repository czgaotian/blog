export function NotFoundPage() {
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-normal">Page not found</h1>
      <p className="text-sm text-muted-foreground">This admin SPA route has not been migrated yet.</p>
      <a className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm text-primary-foreground" href="/admin/dashboard">
        Back to dashboard
      </a>
    </section>
  )
}
