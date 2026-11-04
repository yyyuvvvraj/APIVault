import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import Link from "next/link";

export const metadata: Metadata = { title: "My submissions", robots: { index: false, follow: false } };

export default async function MySubmissionsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/account/login");
  const submissions = await getPrisma().apiSubmission.findMany({
    where: { submitterUserId: session.user.id },
    select: { id: true, kind: true, status: true, reviewNote: true, createdAt: true, targetApi: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" }, take: 50,
  });
  return <main className="min-h-screen bg-[#0b0c0f] px-5 py-12 text-slate-100 sm:px-8"><div className="mx-auto max-w-4xl"><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-rose-400">Community account</p><h1 className="mt-2 text-3xl font-black text-white">My submissions</h1><p className="mt-3 text-sm text-slate-400">Track the review status of your API suggestions and updates.</p><p className="mt-2 text-xs text-slate-500">Need help preparing evidence or understanding a decision? <a href="https://github.com/yyyuvvvraj/APIVault/blob/dev/docs/CONTRIBUTOR_GUIDE.md" target="_blank" rel="noreferrer" className="font-bold text-cyan-300 hover:underline">Read the contributor guide</a>.</p><div className="mt-8 space-y-3">{submissions.map(item=><article key={item.id} className="rounded-xl border border-white/[0.08] bg-[#14171d] p-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-white">{item.targetApi?.name ?? (item.kind === "CREATE" ? "New API suggestion" : "API update")}</p><span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold text-slate-300">{item.status.replaceAll("_"," ")}</span></div><p className="mt-2 text-[10px] text-slate-500">{item.kind} · {new Intl.DateTimeFormat("en",{dateStyle:"medium"}).format(item.createdAt)}</p>{item.reviewNote && <p className="mt-3 text-xs text-slate-400">{item.reviewNote}</p>}</article>)}{!submissions.length && <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-500">You have not submitted an API yet.</p>}</div><Link href="/submit" className="mt-6 inline-block rounded-lg bg-rose-600 px-4 py-3 text-xs font-bold text-white">Submit an API →</a></div></main>;
}
