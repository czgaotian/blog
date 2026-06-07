import { Outlet, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { adminApi } from "../api/query";
import { Alert } from "../components/ui/alert";
import { getInitialTheme, setStoredTheme, type Theme } from "../lib/theme";
import { cn } from "../lib/utils";
import { AdminHeader } from "./base-layout/admin-header";
import { AdminSidebar } from "./base-layout/admin-sidebar";
import { MobileSidebar } from "./base-layout/mobile-sidebar";
import { getCurrentNavLabel } from "./base-layout/navigation";

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const appName = meQuery.data?.app.name || "Worker Blog";
  const appVersion = meQuery.data?.app.version;
  const nextTheme = theme === "dark" ? "light" : "dark";
  const currentSection = getCurrentNavLabel(location.pathname);
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
      <AdminSidebar
        appName={appName}
        appVersion={appVersion}
        collapsed={sidebarCollapsed}
      />

      <div
        className={cn(
          "transition-[padding] md:pl-64",
          sidebarCollapsed && "md:pl-20",
        )}
      >
        <AdminHeader
          currentSection={currentSection}
          mobileNavOpen={mobileNavOpen}
          nextTheme={nextTheme}
          sessionLabel={sessionLabel}
          sidebarCollapsed={sidebarCollapsed}
          theme={theme}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onToggleSidebar={() =>
            setSidebarCollapsed((collapsed) => !collapsed)
          }
          onToggleTheme={() => setTheme(nextTheme)}
        />
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

      <MobileSidebar
        appName={appName}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
    </div>
  );
}
