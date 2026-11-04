import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
export const metadata: Metadata = { title: "Account", robots: { index: false, follow: false } };
const items = [
  { href: "/account/keys", title: "API keys", description: "Create, inspect, and revoke read-only API keys." },
  { href: "/account/profile", title: "Contributor profile", description: "Manage your opt-in public contributor identity." },
  { href: "/account/submissions", title: "My submissions", description: "Track review status and moderator feedback." },
];
export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/account/login");
  return <main className="min-h-screen bg-[#0b0c0f] px-5 py-12 text-slate-100 sm:px-8"><div className="mx-auto max-w-4xl"><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-rose-400">APIVault account</p><h1 className="mt-2 text-3xl font-black text-white">Welcome, {session.user.name}</h1><p className="mt-3 text-sm text-slate-400">Manage your developer access and community contributions.</p><div className="mt-8 grid gap-3 sm:grid-cols-2">{items.map(item=><Link key={item.href} href={item.href} className="rounded-xl border border-white/[0.08] bg-[#14171d] p-5 transition hover:border-rose-400/30"><h2 className="text-sm font-extrabold text-white">{item.title} →</h2><p className="mt-2 text-xs leading-5 text-slate-500">{item.description}</p></Link>)}</div></div></main>;
}