import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SubmissionForm } from "@/components/submission-form";

export const metadata: Metadata = { title: "Submit an API" };

export default async function SubmitPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/account/login");
  return <main className="min-h-screen bg-[#0b0c0f] px-5 py-12 text-slate-100 sm:px-8"><div className="mx-auto max-w-3xl"><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-rose-400">Community contributions</p><h1 className="mt-2 text-3xl font-black text-white">Suggest an API</h1><p className="mt-3 text-sm leading-6 text-slate-400">Share accurate API details and official evidence. Every submission is reviewed by a maintainer and is never published automatically.</p><p className="mt-2 text-xs text-slate-500">First contribution? Read the <a href="https://github.com/yyyuvvvraj/APIVault/blob/dev/docs/CONTRIBUTOR_GUIDE.md" target="_blank" rel="noreferrer" className="font-bold text-cyan-300 hover:underline">contributor guide</a> for evidence standards, review stages, and update tips.</p><div className="mt-8"><SubmissionForm /></div></div></main>;
}
