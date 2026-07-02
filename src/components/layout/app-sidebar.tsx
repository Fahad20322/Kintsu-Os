import Link from "next/link";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { Role } from "@/lib/rbac";

export function AppSidebar({
  role,
  storeName,
}: {
  role: Role;
  storeName: string;
}) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Link href="/dashboard" className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">
            KINTSU <span className="text-primary">OS</span>
          </span>
          <span className="truncate text-xs text-sidebar-foreground/60">
            {storeName}
          </span>
        </Link>
      </div>
      <SidebarNav role={role} />
    </aside>
  );
}
