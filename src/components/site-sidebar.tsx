"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CATEGORY_DIRECTORY } from "@/lib/catalogue/constants";

const primaryLinks = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/apis", label: "Explore APIs", icon: "◫" },
  { href: "/discover", label: "Discovery queue", icon: "⌕" },
  { href: "/docs", label: "API documentation", icon: "▤" },
];
const communityLinks = [
  { href: "https://github.com/yyyuvvvraj/APIVault", label: "GitHub repository" },
  { href: "https://github.com/yyyuvvvraj/APIVault/discussions", label: "Community discussions" },
];

export function SiteSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const navigation = (
    <div className="flex h-full flex-col">
      <Link href="/" onClick={() => setMobileOpen(false)} className="mb-9 flex items-center gap-3 px-2" aria-label="APIVault home">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-sm font-black text-rose-300 ring-1 ring-rose-400/20">AV</span>
        <span className="text-[21px] font-black tracking-[-0.075em] text-white"><span className="text-rose-500">API</span>VAULT</span>
      </Link>

      <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-600">Workspace</p>
      <nav aria-label="Main navigation" className="space-y-1">
        {primaryLinks.map((item) => {
          const active = isActive(item.href);
          return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200 ${active ? "bg-rose-500/10 text-white ring-1 ring-rose-400/20" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"}`}>
            <span className={`w-5 text-center text-base ${active ? "text-rose-400" : "text-slate-600 group-hover:text-slate-300"}`}>{item.icon}</span>{item.label}
            {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-rose-400" />}
          </Link>;
        })}
      </nav>

      <div className="mb-2 mt-9 flex items-center justify-between px-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-600">Categories</p>
        <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-slate-500">{CATEGORY_DIRECTORY.length}</span>
      </div>
      <nav aria-label="API categories" className="max-h-[42vh] space-y-0.5 overflow-y-auto pr-1 lg:max-h-[calc(100vh-410px)]">
        {CATEGORY_DIRECTORY.map((category, index) => {
          const href = `/apis?category=${category.slug}`;
          return <Link key={category.slug} href={href} onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white">
            <span className="w-5 text-center text-[10px] text-slate-600">{["✦","⌘","▥","◈","◉","⌖","▦","▧","☼","⌁"][index % 10]}</span>
            <span className="truncate">{category.name}</span>
          </Link>;
        })}
      </nav>

      <div className="mt-auto pt-7">
        <div className="mb-4 rounded-2xl border border-rose-400/10 bg-gradient-to-br from-rose-500/[0.10] to-transparent p-4">
          <p className="text-xs font-bold text-white">Built by the community</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">Help make the API ecosystem easier to explore.</p>
          <Link href="/submit" onClick={() => setMobileOpen(false)} className="mt-3 inline-flex text-[11px] font-bold text-rose-300 transition hover:text-rose-200">Contribute an API ↗</Link>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-white/[0.07] px-2 pt-4">
          {communityLinks.map((item) => <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-slate-600 transition hover:text-slate-300">{item.label} ↗</a>)}
        </div>
        <p className="px-2 pt-3 text-[10px] text-slate-700">APIVault · Open source</p>
      </div>
    </div>
  );

  return <>
    <div className="sticky top-0 z-50 flex items-center justify-between border-b border-white/[0.08] bg-[#090a0d]/95 px-4 py-3 backdrop-blur-xl lg:hidden">
      <Link href="/" className="text-lg font-black tracking-[-0.07em] text-white"><span className="text-rose-500">API</span>VAULT</Link>
      <button type="button" onClick={() => setMobileOpen((open) => !open)} aria-expanded={mobileOpen} aria-controls="mobile-site-navigation"
        className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/5">{mobileOpen ? "Close ✕" : "Menu ☰"}</button>
    </div>
    <aside className="hidden w-[272px] shrink-0 border-r border-white/[0.07] bg-[#090a0d] px-5 py-7 lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto">
      {navigation}
    </aside>
    {mobileOpen && <div id="mobile-site-navigation" className="fixed inset-0 z-40 overflow-y-auto border-r border-white/10 bg-[#090a0d] px-5 pb-8 pt-6 lg:hidden">{navigation}</div>}
  </>;
}
