import { NavLink, Outlet } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Activity,
  Database,
  FileText,
  Gauge,
  Image,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  BarChart3,
  Settings,
  Sun,
  User,
} from "lucide-react";
import { adminApi } from "../api/query";
import { Alert } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { ButtonLink } from "../components/ui/button";
import { getInitialTheme, setStoredTheme, type Theme } from "../lib/theme";
import { cn } from "../lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Gauge },
  { label: "Logs", href: "/logs", icon: Activity },
  { label: "Content", href: "/content", icon: FileText },
  { label: "Media", href: "/media", icon: Image },
  { label: "Collections", href: "/collections", icon: Database },
  { label: "Security Audit", href: "/security-audit", icon: ShieldCheck },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "SPA Test", href: "/spa-test", icon: Activity },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Profile", href: "/profile", icon: User },
];

export function BaseLayout() {
  const meQuery = useQuery({
    queryKey: ["admin", "me"],
    queryFn: adminApi.me,
  });
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    return getInitialTheme(
      window.localStorage,
      window.matchMedia("(prefers-color-scheme: dark)").matches,
    );
  });

  const appName = meQuery.data?.app.name || "Worker Blog";
  const appVersion = meQuery.data?.app.version;
  const nextTheme = theme === "dark" ? "light" : "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    setStoredTheme(window.localStorage, theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card px-3 py-4 md:flex md:flex-col">
        <a
          href="/dashboard"
          className="flex h-10 items-center justify-between px-2 text-sm font-semibold"
        >
          <span className="truncate">{appName}</span>
          {appVersion ? <Badge>{appVersion}</Badge> : null}
        </a>
        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const className =
              "flex h-10 items-center gap-3 rounded-md px-2 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring";

            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(className, isActive && "bg-muted text-primary")
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background px-4">
          <div className="flex min-w-0 items-center gap-3">
            <ButtonLink
              className="md:hidden"
              href="/dashboard"
              variant="ghost"
              size="sm"
              aria-label="Admin menu"
            >
              <Menu className="h-4 w-4" />
            </ButtonLink>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Admin</p>
              <p className="truncate text-xs text-muted-foreground">
                {meQuery.data
                  ? `${meQuery.data.user.email} · ${meQuery.data.user.role}`
                  : "Loading session"}
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
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <ButtonLink href="/api/auth/logout" variant="ghost">
              <LogOut className="h-4 w-4" />
              Sign out
            </ButtonLink>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">
          {meQuery.isError ? (
            <Alert
              className="mb-6"
              title="Could not load admin session"
              tone="danger"
            >
              Refresh the page or sign in again.
            </Alert>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
