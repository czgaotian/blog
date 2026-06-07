import { NavLink } from "react-router";
import { cn } from "../../lib/utils";
import { navSections } from "./navigation";

interface NavListProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function NavList({ collapsed = false, onNavigate }: NavListProps) {
  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
      {navSections.map((section) => (
        <div className="flex flex-col gap-1" key={section.label}>
          {collapsed ? null : (
            <p className="px-3 text-xs font-medium uppercase text-muted-foreground">
              {section.label}
            </p>
          )}
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
                    collapsed && "justify-center px-0",
                    isActive &&
                      "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground",
                  )
                }
                title={collapsed ? item.label : undefined}
              >
                <Icon className="size-4 shrink-0" />
                {collapsed ? null : <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
