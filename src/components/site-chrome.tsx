"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export function SiteChrome({
  children,
  header,
  footer,
}: {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isAdmin = pathname.startsWith("/admin");

  return (
    <>
      {!isHome && !isAdmin && header}
      {children}
      {!isHome && !isAdmin && footer}
    </>
  );
}
