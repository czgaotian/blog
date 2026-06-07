import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Activity,
  FileText,
  FolderTree,
  Gauge,
  Image,
  LogOut,
  Menu,
  Moon,
  PanelLeft,
  ShieldCheck,
  BarChart3,
  Settings,
  Sun,
  Tags,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { adminApi } from "../api/query";
import { Alert } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { getInitialTheme, setStoredTheme, type Theme } from "../lib/theme";
import { cn } from "../lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navSections: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Operate",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: Gauge },
      { label: "Contents", href: "/contents", icon: FileText },
      { label: "Media", href: "/media", icon: Image },
      { label: "Categories", href: "/categories", icon: FolderTree },
      { label: "Tags", href: "/tags", icon: Tags },
    ],
  },
  {
    label: "Observe",
    items: [
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Logs", href: "/logs", icon: Activity },
      { label: "Security Audit", href: "/security-audit", icon: ShieldCheck },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Profile", href: "/profile", icon: User },
      { label: "SPA Test", href: "/spa-test", icon: Activity },
    ],
  },
];

const navItems = navSections.flatMap((section) => section.items);

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
      {navSections.map((section) => (
        <div className="flex flex-col gap-1" key={section.label}>
          <p className="px-3 text-xs font-medium uppercase text-muted-foreground">
            {section.label}
          </p>
          {section.items.map((item) => {
            const Icon = item.icon;
            const className =
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring";

            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    className,
                    isActive &&
                      "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground",
                  )
                }
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function BaseLayout() {
  const location = useLocation();
  const meQuery = useQuery({
    queryKey: ["session"],
    queryFn: adminApi.session,
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const appName = meQuery.data?.app.name || "Worker Blog";
  const appVersion = meQuery.data?.app.version;
  const nextTheme = theme === "dark" ? "light" : "dark";
  const currentSection =
    navItems
      .filter(
        (item) =>
          location.pathname === item.href ||
          location.pathname.startsWith(`${item.href}/`),
      )
      .sort((a, b) => b.href.length - a.href.length)[0]?.label ?? "Admin";
  const sessionLabel = meQuery.data
    ? `${meQuery.data.user.email} · ${meQuery.data.user.role}`
    : meQuery.isLoading
      ? "Loading session"
      : "Session unavailable";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    setStoredTheme(window.localStorage, theme);
  }, [theme]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-background px-3 py-4 md:flex md:flex-col">
        <Link
          to="/dashboard"
          className="flex h-11 items-center gap-3 rounded-md px-3 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            {appName.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{appName}</span>
            <span className="block truncate text-xs text-muted-foreground">
              Admin console
            </span>
          </span>
          {appVersion ? <Badge className="shrink-0">{appVersion}</Badge> : null}
        </Link>
        <div className="mt-6 flex min-h-0 flex-1 flex-col">
          <NavList />
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              aria-expanded={mobileNavOpen}
              aria-label="Open admin menu"
              className="md:hidden"
              size="icon"
              type="button"
              variant="ghost"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu />
            </Button>
            <PanelLeft className="hidden size-4 shrink-0 text-muted-foreground md:block" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{currentSection}</p>
              <p className="truncate text-xs text-muted-foreground">
                {sessionLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              aria-label={`Switch to ${nextTheme} mode`}
              size="icon"
              type="button"
              variant="ghost"
              onClick={() => setTheme(nextTheme)}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
            <Button asChild variant="ghost">
              <a href="/api/auth/logout">
                <LogOut data-icon="inline-start" />
                <span className="hidden sm:inline">Sign out</span>
              </a>
            </Button>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          {meQuery.isError ? (
            <Alert
              title="Could not load admin session"
              tone="danger"
            >
              Refresh the page or sign in again.
            </Alert>
          ) : null}
          <Outlet />
        </main>
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 md:hidden" role="presentation">
          <button
            aria-label="Close admin menu"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            type="button"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative flex h-full w-80 max-w-[calc(100vw-2rem)] flex-col border-r border-border bg-background px-3 py-4 shadow-xl">
            <div className="flex h-11 items-center gap-3 px-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                {appName.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{appName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Admin console
                </p>
              </div>
              <Button
                aria-label="Close admin menu"
                size="icon"
                type="button"
                variant="ghost"
                onClick={() => setMobileNavOpen(false)}
              >
                <X />
              </Button>
            </div>
            <div className="mt-6 flex min-h-0 flex-1 flex-col">
              <NavList onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
