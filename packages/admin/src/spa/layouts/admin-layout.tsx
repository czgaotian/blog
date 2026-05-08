import { NavLink, Outlet } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  Activity,
  BookOpen,
  Database,
  FileText,
  Gauge,
  Image,
  LogOut,
  Menu,
  Moon,
  Plug,
  Settings,
  Sun,
  Users,
} from 'lucide-react'
import { adminApi } from '../api/query'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { ButtonLink } from '../components/ui/button'
import { getInitialTheme, setStoredTheme, type Theme } from '../lib/theme'
import { cn } from '../lib/utils'

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: Gauge },
  { label: 'Logs', href: '/admin/logs', icon: Activity },
  { label: 'Content', href: '/admin/content', icon: FileText, legacy: true },
  { label: 'Media', href: '/admin/media', icon: Image, legacy: true },
  { label: 'Collections', href: '/admin/collections', icon: Database, legacy: true },
  { label: 'Users', href: '/admin/users', icon: Users, legacy: true },
  { label: 'Plugins', href: '/admin/plugins', icon: Plug },
  { label: 'API Reference', href: '/admin/api-reference', icon: BookOpen },
  { label: 'SPA Test', href: '/admin/spa-test', icon: Activity },
  { label: 'Settings', href: '/admin/settings', icon: Settings, legacy: true },
]

export function AdminLayout() {
  const meQuery = useQuery({
    queryKey: ['admin', 'me'],
    queryFn: adminApi.me,
  })
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return 'light'
    }

    return getInitialTheme(window.localStorage, window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  const appName = meQuery.data?.app.name || 'Worker Blog'
  const appVersion = meQuery.data?.app.version
  const pluginMenu = meQuery.data?.pluginMenu || []
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    setStoredTheme(window.localStorage, theme)
  }, [theme])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card px-3 py-4 md:flex md:flex-col">
        <a href="/admin/dashboard" className="flex h-10 items-center justify-between px-2 text-sm font-semibold">
          <span className="truncate">{appName}</span>
          {appVersion ? <Badge>{appVersion}</Badge> : null}
        </a>
        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const className = 'flex h-10 items-center gap-3 rounded-md px-2 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring'

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
                className={({ isActive }) => cn(className, isActive && 'bg-muted text-primary')}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            )
          })}
          {pluginMenu.length > 0 ? (
            <div className="pt-4">
              <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">Plugins</p>
              <div className="space-y-1">
                {pluginMenu.map((item) => (
                  <a
                    key={item.path}
                    className="flex h-10 items-center gap-3 rounded-md px-2 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                    href={item.path}
                  >
                    <Plug className="h-4 w-4" />
                    <span className="truncate">{item.label}</span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </nav>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background px-4">
          <div className="flex min-w-0 items-center gap-3">
            <ButtonLink className="md:hidden" href="/admin/dashboard" variant="ghost" size="sm" aria-label="Admin menu">
              <Menu className="h-4 w-4" />
            </ButtonLink>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Admin</p>
              <p className="truncate text-xs text-muted-foreground">
                {meQuery.data ? `${meQuery.data.user.email} · ${meQuery.data.user.role}` : 'Loading session'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              aria-label={`Switch to ${nextTheme} mode`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              type="button"
              onClick={() => setTheme(nextTheme)}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <ButtonLink href="/auth/logout" variant="ghost">
              <LogOut className="h-4 w-4" />
              Sign out
            </ButtonLink>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">
          {meQuery.isError ? (
            <Alert className="mb-6" title="Could not load admin session" tone="danger">
              Refresh the page or sign in again.
            </Alert>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
