"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteSidebar } from "@/components/site-sidebar";

export function SiteChrome({ children, header, footer }: { children: ReactNode; header: ReactNode; footer: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-[#0b0c0f] text-slate-100">
      <SiteSidebar />
      <div className="min-w-0 flex-1">
        {children}
        <footer className="border-t border-white/[0.07] bg-[#090a0d] px-6 py-6 text-[11px] text-slate-600 sm:px-8">
          <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-3">
            <span><strong className="text-slate-300">APIVault</strong> · A community-built API directory.</span>
            <span>Discover · Verify · Build</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
