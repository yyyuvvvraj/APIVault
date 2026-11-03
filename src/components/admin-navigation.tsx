"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const items = [
  { href: "/admin", label: "Overview", icon: "▦" },
  { href: "/admin/apis", label: "API catalogue", icon: "◫" },
  { href: "/admin/freshness", label: "Catalogue freshness", icon: "◷" },
  { href: "/admin/health", label: "Verifier health", icon: "◉" },
  { href: "/admin/submissions", label: "Submissions", icon: "⇩" },
  { href: "/admin/categories", label: "Categories", icon: "▤" },
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
    <aside className="flex w-full shrink-0 flex-col border-b border-white/10 bg-[#0d1118] lg:sticky lg:top-0 lg:h-screen lg:w-[260px] lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 px-6 py-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#181d27] text-xl font-black tracking-tight text-white ring-1 ring-white/10">
          <span className="text-rose-500">A</span>V
        </span>
        <div>
          <p className="text-sm font-black tracking-[0.12em] text-white">APIVAULT</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Control centre</p>
        </div>
      </div>

      <div className="px-4 pb-3">
        <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-600">Workspace</p>
        <nav aria-label="Admin navigation" className="grid grid-cols-2 gap-1 lg:grid-cols-1">
          {items.map((item) => {
            const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-white/10 text-white shadow-inner shadow-white/5" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
              >
                <span className={`w-5 text-center text-base ${active ? "text-rose-400" : "text-slate-600"}`}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-sm font-black text-rose-300">
            {name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">{name}</p>
            <p className="truncate text-[11px] text-slate-500">{email}</p>
          </div>
        </div>
        <button type="button" onClick={signOut} className="mt-3 w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-500 transition hover:bg-white/5 hover:text-white">
          Sign out ↗
        </button>
      </div>
    </aside>
  );
}
