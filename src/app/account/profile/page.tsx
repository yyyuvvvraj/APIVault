import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ContributorProfileForm } from "@/components/contributor-profile-form";
import Link from "next/link";

export const metadata: Metadata = { title: "Contributor profile", robots: { index: false, follow: false } };

export default async function ContributorProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/account/login");
  return <main className="min-h-screen bg-[#0b0c0f] px-5 py-12 text-slate-100 sm:px-8"><div className="mx-auto max-w-3xl"><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-rose-400">Community account</p><h1 className="mt-2 text-3xl font-black text-white">Contributor profile</h1><p className="mt-3 text-sm leading-6 text-slate-400">Your profile is private by default. Turn on public visibility only when you are comfortable sharing the details below. Public profiles show only the fields listed in the form and your approved contribution count.</p><p className="mt-2 text-xs text-slate-500"><a href="https://github.com/yyyuvvvraj/APIVault/blob/dev/docs/CONTRIBUTOR_GUIDE.md" target="_blank" rel="noreferrer" className="font-bold text-cyan-300 hover:underline">Contributor guide</Link> explains profile visibility and community expectations.</p><div className="mt-8"><ContributorProfileForm defaultName={session.user.name} /></div></div></main>;
}
