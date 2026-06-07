import { LogOut, Menu, Moon, PanelLeft, Sun } from "lucide-react";
import { Button } from "../../components/ui/button";
import type { Theme } from "../../lib/theme";

interface AdminHeaderProps {
  currentSection: string;
  sessionLabel: string;
  mobileNavOpen: boolean;
  sidebarCollapsed: boolean;
  theme: Theme;
  nextTheme: Theme;
  onOpenMobileNav: () => void;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
}

export function AdminHeader({
  currentSection,
  sessionLabel,
  mobileNavOpen,
  sidebarCollapsed,
  theme,
  nextTheme,
  onOpenMobileNav,
  onToggleSidebar,
  onToggleTheme,
}: AdminHeaderProps) {
  return (
    <header className="sticky top-0 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          aria-expanded={mobileNavOpen}
          aria-label="Open admin menu"
          className="md:hidden"
          size="icon"
          type="button"
          variant="ghost"
          onClick={onOpenMobileNav}
        >
          <Menu />
        </Button>
        <Button
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={sidebarCollapsed}
          className="hidden md:inline-flex"
          size="icon"
          type="button"
          variant="ghost"
          onClick={onToggleSidebar}
        >
          <PanelLeft />
        </Button>
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
          onClick={onToggleTheme}
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
  );
}
