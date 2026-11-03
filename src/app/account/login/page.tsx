import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AccountLoginForm } from "@/components/account-login-form";

export const metadata: Metadata = { title: "Account sign in", robots: { index: false, follow: false } };

export default async function AccountLoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect("/account");
  return <main className="flex min-h-screen items-center justify-center bg-[#090c11] px-5 py-12 text-white"><div className="w-full max-w-[430px]"><Link href="/" className="mb-8 inline-flex text-lg font-black tracking-[0.13em]"><span className="text-rose-500">API</span>VAULT</Link><section className="rounded-3xl border border-white/10 bg-[#0f141d] p-7 shadow-2xl shadow-black/40 sm:p-9"><p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-rose-400">Developer account</p><h1 className="mt-3 text-3xl font-black tracking-tight">Sign in.</h1><p className="mt-2 text-sm leading-6 text-slate-400">Sign in to manage API keys and community contributions. Accounts are provisioned by APIVault maintainers; public sign-up is disabled.</p><div className="mt-7"><AccountLoginForm /></div></section></div></main>;
}
