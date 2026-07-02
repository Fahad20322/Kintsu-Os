"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/components/layout/nav-config";
import { hasPermission, type Role } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export function SidebarNav({
  role,
  onNavigate,
}: {
  role: Role;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) =>
          hasPermission(role, item.permission)
        );
        if (items.length === 0) return null;

        return (
          <div key={group.label}>
            <p className="mb-2 px-3 text-xs font-medium tracking-wide text-sidebar-foreground/50 uppercase">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
