import Link from "next/link";
import { VerificationStatus } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { getApiReviewReadiness } from "@/lib/catalogue/review-readiness";

export const metadata = { title: "Verification queue" };

const statusLabel: Record<string, string> = {
  PENDING_REVIEW: "Pending review",
  UNVERIFIED: "Unverified",
  STALE: "Stale",
};

export default async function AdminVerificationQueuePage() {
  const apis = await getPrisma().api.findMany({
    where: {
      verificationStatus: {
        in: [
          VerificationStatus.PENDING_REVIEW,
          VerificationStatus.UNVERIFIED,
          VerificationStatus.STALE,
        ],
      },
    },
    include: {
      provider: { select: { name: true } },
      categories: { select: { categoryId: true } },
      authMethods: { select: { method: true } },
      sources: { select: { id: true, sourceKind: true, url: true, isOfficial: true, checkedAt: true } },
    },
    orderBy: [
      { verificationStatus: "asc" },
      { createdAt: "asc" },
    ],
    take: 200,
  });

  const pendingCount = apis.filter((api) => api.verificationStatus === VerificationStatus.PENDING_REVIEW).length;
  const unverifiedCount = apis.filter((api) => api.verificationStatus === VerificationStatus.UNVERIFIED).length;
  const staleCount = apis.filter((api) => api.verificationStatus === VerificationStatus.STALE).length;
  const readiness = new Map(apis.map((api) => [api.id, getApiReviewReadiness(api)]));
  const withGapsCount = [...readiness.values()].filter((item) => item.gaps.length > 0).length;

  return (
    <>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-rose-400">Workspace / Review</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Verification queue</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">Review catalogue evidence before an API becomes publicly discoverable. Only ACTIVE + VERIFIED records are exposed by public endpoints.</p>
        </div>
        <Link href="/admin/apis" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/[0.08]">All catalogue records ↗</Link>
      </header>

      <section aria-label="Verification queue counts" className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Pending review</p><p className="mt-2 text-2xl font-black text-white">{pendingCount}</p></div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#10151e] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unverified</p><p className="mt-2 text-2xl font-black text-white">{unverifiedCount}</p></div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#10151e] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stale</p><p className="mt-2 text-2xl font-black text-white">{staleCount}</p></div>
      </section>

      <section aria-label="Evidence coverage" className="mb-6 rounded-2xl border border-white/[0.08] bg-[#10151e] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-extrabold text-white">Evidence coverage</h2><p className="mt-1 text-xs text-slate-500">Automated completeness hints; maintainers must still inspect the linked sources.</p></div><span className="rounded-full bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300">{withGapsCount} record{withGapsCount === 1 ? "" : "s"} with gaps</span></div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#10151e]">
        <div className="border-b border-white/[0.07] px-5 py-4">
          <h2 className="text-sm font-extrabold text-white">Records requiring verification ({apis.length})</h2>
          <p className="mt-1 text-xs text-slate-500">Open a record to inspect official homepage, documentation, pricing and authentication evidence.</p>
        </div>
        {apis.length ? (
          <div className="divide-y divide-white/[0.06]">
            {apis.map((api) => {
              const officialSources = api.sources.filter((source) => source.isOfficial).length;
              const review = readiness.get(api.id)!;
              return (
                <article key={api.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition hover:bg-white/[0.025]">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-100">{api.name}</h3>
                      <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-300">{statusLabel[api.verificationStatus]}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{api.provider.name} · /{api.slug} · {api.status}</p>
                    <p className="mt-1 text-xs text-slate-400">{officialSources} official source{officialSources === 1 ? "" : "s"} · {api.sources.length} total source{api.sources.length === 1 ? "" : "s"} · {api.categories.length} categor{api.categories.length === 1 ? "y" : "ies"} · {api.authMethods.length} auth method{api.authMethods.length === 1 ? "" : "s"}</p>
                    {review.gaps.length > 0 ? <p className="mt-2 text-xs leading-5 text-amber-300">Evidence gaps: {review.gaps.join(" · ")}</p> : <p className="mt-2 text-xs text-emerald-300">Baseline evidence coverage complete</p>}
                  </div>
                  <Link href={`/admin/apis/${api.slug}/review`} className="rounded-lg border border-cyan-400/20 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-400/10">Inspect evidence →</Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-14 text-center">
            <p className="text-sm font-bold text-slate-200">The verification queue is clear.</p>
            <p className="mt-2 text-xs text-slate-500">New and updated catalogue records will appear here until reviewed.</p>
          </div>
        )}
      </section>
    </>
  );
}
