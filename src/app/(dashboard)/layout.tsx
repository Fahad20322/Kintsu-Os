import { eq } from "drizzle-orm";
import { db } from "@/db";
import { store as storeTable } from "@/db/schema";
import { requireUser } from "@/lib/session";
import type { Role } from "@/lib/rbac";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { StoreOnboardingGate } from "@/components/layout/store-onboarding-gate";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  if (!user.storeId) {
    return <StoreOnboardingGate />;
  }

  const [store] = await db
    .select({ name: storeTable.name })
    .from(storeTable)
    .where(eq(storeTable.id, user.storeId))
    .limit(1);

  const role = user.role as Role;

  return (
    <div className="flex h-screen overflow-hidden bg-muted/20">
      <AppSidebar role={role} storeName={store?.name ?? "Kintsu OS"} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar role={role} userName={user.name} userEmail={user.email} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
