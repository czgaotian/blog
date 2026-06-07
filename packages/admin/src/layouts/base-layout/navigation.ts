import {
  Activity,
  BarChart3,
  FileText,
  FolderTree,
  Gauge,
  Image,
  Settings,
  ShieldCheck,
  Tags,
  User,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navSections: Array<{ label: string; items: NavItem[] }> = [
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

export function getCurrentNavLabel(pathname: string) {
  return (
    navItems
      .filter(
        (item) =>
          pathname === item.href || pathname.startsWith(`${item.href}/`),
      )
      .sort((a, b) => b.href.length - a.href.length)[0]?.label ?? "Admin"
  );
}
