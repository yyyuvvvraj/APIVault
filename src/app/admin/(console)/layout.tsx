import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminNavigation } from "@/components/admin-navigation";

export default async function AdminConsoleLayout({ children }: { children: ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen bg-[#090c11] text-slate-100 lg:flex">
      <AdminNavigation
        name={session.user.name || "APIVault admin"}
        email={session.user.email}
      />
      <main className="min-w-0 flex-1 px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
        <div className="mx-auto max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
