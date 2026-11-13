"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/apis", label: "Explore" },
  { href: "/discover", label: "Discover" },
  { href: "/docs", label: "Docs" },
  { href: "/account", label: "My Vault" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="av-topbar sticky top-0 z-50 w-full text-white">
      <div className="mx-auto flex h-[68px] max-w-[1720px] items-center gap-8 px-5 sm:px-8 lg:px-12">
        <Link href="/" className="shrink-0 text-[25px] font-black tracking-[-0.085em]" aria-label="APIVault home">
          <span className="text-[#e50914]">API</span><span className="text-white">VAULT</span>
        </Link>
        <nav aria-label="Main navigation" className="flex min-w-0 flex-1 items-center gap-5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] sm:gap-7">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={`text-[13px] transition-colors hover:text-white ${active ? "font-bold text-white" : "font-medium text-neutral-400"}`}>{link.label}</Link>;
          })}
        </nav>
        <div className="hidden shrink-0 items-center gap-4 sm:flex">
          <a href="https://github.com/yyyuvvvraj/APIVault" target="_blank" rel="noreferrer" aria-label="GitHub repository" className="text-neutral-300 transition hover:text-white"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.08c-3.1.67-3.76-1.32-3.76-1.32-.5-1.28-1.24-1.62-1.24-1.62-1.02-.7.08-.69.08-.69 1.12.08 1.7 1.15 1.7 1.15 1 1.7 2.61 1.2 3.25.92.1-.72.39-1.2.71-1.48-2.47-.28-5.07-1.24-5.07-5.5 0-1.21.43-2.2 1.15-2.98-.12-.28-.5-1.42.11-2.95 0 0 .94-.3 3.05 1.14a10.6 10.6 0 0 1 5.55 0c2.11-1.44 3.05-1.14 3.05-1.14.61 1.53.23 2.67.11 2.95.72.78 1.15 1.77 1.15 2.98 0 4.27-2.6 5.22-5.08 5.5.4.35.76 1.02.76 2.06v3.06c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z"/></svg></a>
          <a href="https://github.com/yyyuvvvraj/APIVault/issues/new?template=api_submission.yml" target="_blank" rel="noreferrer" className="rounded-[4px] bg-[#e50914] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#f6121d]">Submit API</a>
        </div>
      </div>
    </header>
  );
}
