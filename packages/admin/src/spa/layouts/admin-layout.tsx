import { NavLink, Outlet } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Activity, Gauge, LogOut, Settings } from 'lucide-react'
import { adminApi } from '../api/query'

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: Gauge, legacy: true },
  { label: 'SPA Test', href: '/admin/spa-test', icon: Activity },
  { label: 'Settings', href: '/admin/settings', icon: Settings, legacy: true },
]

export function AdminLayout() {
  const meQuery = useQuery({
    queryKey: ['admin', 'me'],
    queryFn: adminApi.me,
  })

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card px-3 py-4 md:block">
        <a href="/admin/dashboard" className="flex h-10 items-center px-2 text-sm font-semibold">
          Worker Blog
        </a>
        <nav className="mt-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const className = 'flex h-10 items-center gap-3 rounded-md px-2 text-sm font-medium hover:bg-muted'

            if (item.legacy) {
              return (
                <a key={item.href} href={item.href} className={className}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </a>
              )
            }

            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) => `${className} ${isActive ? 'bg-muted text-primary' : ''}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background px-4">
          <div>
            <p className="text-sm font-medium">Admin</p>
            <p className="text-xs text-muted-foreground">
              {meQuery.data ? `${meQuery.data.user.email} · ${meQuery.data.app.version}` : 'Loading session'}
            </p>
          </div>
          <a className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm hover:bg-muted" href="/auth/logout">
            <LogOut className="h-4 w-4" />
            Sign out
          </a>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
