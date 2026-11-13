"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const items = [
  { href: "/admin", label: "Overview" },
  { href: "/discover", label: "Discover leads" },
  { href: "/admin/apis", label: "API catalogue" },
  { href: "/admin/review-queue", label: "Verification" },
  { href: "/admin/freshness", label: "Freshness" },
  { href: "/admin/health", label: "Verifier health" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/categories", label: "Categories" },
];

export function AdminNavigation({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <header className="av-admin-nav sticky top-0 z-50 border-b border-white/10 bg-black/95 text-white backdrop-blur-xl">
      <div className="mx-auto flex min-h-[72px] max-w-[1800px] items-center gap-5 px-5 sm:px-8 lg:px-12">
        <Link href="/admin" className="shrink-0 text-[23px] font-black tracking-[-0.085em]" aria-label="APIVault admin overview">
          <span className="text-[#e50914]">API</span><span>VAULT</span>
        </Link>
        <span className="hidden h-7 w-px bg-white/15 md:block" />
        <span className="hidden shrink-0 text-[10px] font-black uppercase tracking-[0.2em] text-[#e50914] md:block">Control room</span>
        <nav aria-label="Admin navigation" className="av-admin-links flex min-w-0 flex-1 items-center gap-5 overflow-x-auto whitespace-nowrap py-3 [scrollbar-width:none] lg:gap-6">
          {items.map((item) => {
            const active = item.href === "/admin" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                className={`relative py-2 text-xs transition-colors hover:text-white ${active ? "font-extrabold text-white" : "font-semibold text-neutral-400"}`}>
                {item.label}
                {active && <span className="absolute inset-x-0 -bottom-[13px] h-[3px] rounded-full bg-[#e50914]" />}
              </Link>
            );
          })}
        </nav>
        <div className="hidden shrink-0 items-center gap-3 xl:flex">
          <div className="max-w-[180px] text-right">
            <p className="truncate text-xs font-bold text-white">{name}</p>
            <p className="truncate text-[10px] text-neutral-500">{email}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#1a1a1a] text-sm font-black text-white">{name.slice(0, 1).toUpperCase()}</div>
          <button type="button" onClick={signOut} aria-label="Sign out of the APIVault admin console" className="rounded-[4px] border border-white/15 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-neutral-300 transition hover:border-[#e50914] hover:bg-[#e50914] hover:text-white">Sign out</button>
        </div>
        <button type="button" onClick={signOut} className="shrink-0 rounded-[4px] bg-[#e50914] px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-white transition hover:bg-[#f6121d] xl:hidden">Exit</button>
      </div>
    </header>
  );
}
