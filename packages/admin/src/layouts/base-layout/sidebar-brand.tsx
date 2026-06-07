import { Link } from "react-router";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../lib/utils";

interface SidebarBrandProps {
  appName: string;
  appVersion?: string;
  collapsed?: boolean;
}

export function SidebarBrand({
  appName,
  appVersion,
  collapsed = false,
}: SidebarBrandProps) {
  return (
    <Link
      to="/dashboard"
      className={cn(
        "flex h-11 items-center gap-3 rounded-md px-3 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
        collapsed && "justify-center px-0",
      )}
      title={collapsed ? appName : undefined}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
        {appName.slice(0, 1).toUpperCase()}
      </span>
      {collapsed ? null : (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{appName}</span>
            <span className="block truncate text-xs text-muted-foreground">
              Admin console
            </span>
          </span>
          {appVersion ? <Badge className="shrink-0">{appVersion}</Badge> : null}
        </>
      )}
    </Link>
  );
}
