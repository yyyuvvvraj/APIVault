"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site-header";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) return <>{children}</>;

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />
      <div className="min-w-0">{children}</div>
      <footer className="border-t border-white/10 bg-black px-6 py-8 text-xs text-neutral-500 sm:px-10">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <span><strong className="font-black tracking-tight text-white"><span className="text-[#e50914]">API</span>VAULT</strong> · The open catalogue for developers.</span>
          <div className="flex gap-5"><a className="transition hover:text-white" href="https://github.com/yyyuvvvraj/APIVault" target="_blank" rel="noreferrer">GitHub</a><a className="transition hover:text-white" href="https://github.com/yyyuvvvraj/APIVault/discussions" target="_blank" rel="noreferrer">Community</a></div>
        </div>
      </footer>
    </div>
  );
}
