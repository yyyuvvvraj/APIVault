"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isAdmin = pathname.startsWith("/admin");

  return (
    <>
      {!isHome && !isAdmin && <SiteHeader />}
      {children}
      {!isHome && !isAdmin && <SiteFooter />}
    </>
  );
}
