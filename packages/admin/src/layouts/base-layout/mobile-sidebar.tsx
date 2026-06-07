import { X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { NavList } from "./nav-list";

interface MobileSidebarProps {
  appName: string;
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ appName, open, onClose }: MobileSidebarProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 md:hidden" role="presentation">
      <button
        aria-label="Close admin menu"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        type="button"
        onClick={onClose}
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
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
        <div className="mt-6 flex min-h-0 flex-1 flex-col">
          <NavList onNavigate={onClose} />
        </div>
      </aside>
    </div>
  );
}
