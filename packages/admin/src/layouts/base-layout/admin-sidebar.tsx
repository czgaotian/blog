import { cn } from "../../lib/utils";
import { NavList } from "./nav-list";
import { SidebarBrand } from "./sidebar-brand";

interface AdminSidebarProps {
  appName: string;
  appVersion?: string;
  collapsed: boolean;
}

export function AdminSidebar({
  appName,
  appVersion,
  collapsed,
}: AdminSidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 hidden border-r border-border bg-background px-3 py-4 transition-[width] md:flex md:flex-col",
        collapsed ? "w-20" : "w-64",
      )}
    >
      <SidebarBrand
        appName={appName}
        appVersion={appVersion}
        collapsed={collapsed}
      />
      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        <NavList collapsed={collapsed} />
      </div>
    </aside>
  );
}
