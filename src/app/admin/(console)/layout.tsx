import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminNavigation } from "@/components/admin-navigation";

export default async function AdminConsoleLayout({ children }: { children: ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="av-admin min-h-screen bg-black text-white">
      <AdminNavigation name={session.user.name || "APIVault admin"} email={session.user.email} />
      <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-[1600px]">{children}</div>
      </main>
      <footer className="border-t border-white/10 px-6 py-6 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-600">
        APIVault · Maintainer control room
      </footer>
    </div>
  );
}
