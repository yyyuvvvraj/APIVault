import Link from "next/link";
import { ApiStatus, VerificationStatus } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { CATALOGUE_REVIEW_INTERVAL_DAYS, getCatalogueFreshnessState, getCatalogueReviewDueAt } from "@/lib/catalogue/freshness";

export const metadata = { title: "Catalogue freshness" };

function dateLabel(value: Date | null) {
  if (!value) return "No review recorded";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(value);
}

export default async function AdminCatalogueFreshnessPage() {
  const now = new Date();
  const apis = await getPrisma().api.findMany({
    where: {
      verificationStatus: VerificationStatus.VERIFIED,
      status: { in: [ApiStatus.ACTIVE, ApiStatus.DEPRECATED, ApiStatus.UNAVAILABLE] },
    },
    select: {
      id: true, name: true, slug: true, status: true, lastCheckedAt: true,
      provider: { select: { name: true } },
    },
    orderBy: [{ lastCheckedAt: "asc" }, { name: "asc" }],
  });

  const neverChecked = apis.filter((api) => getCatalogueFreshnessState(api.lastCheckedAt, now) === "NEVER_CHECKED");
  const overdue = apis.filter((api) => getCatalogueFreshnessState(api.lastCheckedAt, now) === "OVERDUE");
  const due = [...neverChecked, ...overdue];

  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-rose-400">Workspace / Governance</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Catalogue freshness</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">Verified catalogue entries are due for a human evidence review every {CATALOGUE_REVIEW_INTERVAL_DAYS} days. This report flags records only; it never changes verification status.</p>
        </div>
        <Link href="/admin/apis" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/[0.08]">API catalogue ↗</Link>
      </header>

      <section aria-label="Freshness summary" className="mb-6 grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-white/[0.08] bg-[#10151e] p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Verified monitored</p><p className="mt-3 text-3xl font-black text-white">{apis.length}</p></article>
        <article className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-5"><p className="text-xs font-bold uppercase tracking-wider text-amber-300">Never checked</p><p className="mt-3 text-3xl font-black text-white">{neverChecked.length}</p></article>
        <article className="rounded-2xl border border-orange-400/20 bg-orange-400/[0.05] p-5"><p className="text-xs font-bold uppercase tracking-wider text-orange-300">Overdue ≥ {CATALOGUE_REVIEW_INTERVAL_DAYS} days</p><p className="mt-3 text-3xl font-black text-white">{overdue.length}</p></article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#10151e]">
        <div className="border-b border-white/[0.07] px-5 py-4"><h2 className="text-sm font-extrabold text-white">Requires review ({due.length})</h2><p className="mt-1 text-xs text-slate-500">Review evidence manually and record the result from each API's review page.</p></div>
        {due.length ? (
          <div className="divide-y divide-white/[0.06]">
            {due.map((api) => {
              const state = getCatalogueFreshnessState(api.lastCheckedAt, now);
              const dueAt = api.lastCheckedAt ? getCatalogueReviewDueAt(api.lastCheckedAt) : null;
              return (
                <div key={api.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-100">{api.name}</p><p className="mt-1 text-xs text-slate-500">{api.provider.name} · {api.status} · Last checked: {dateLabel(api.lastCheckedAt)}</p>{dueAt && <p className="mt-1 text-[11px] text-orange-300">Review due: {dateLabel(dueAt)}</p>}</div>
                  <div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${state === "NEVER_CHECKED" ? "bg-amber-400/10 text-amber-300" : "bg-orange-400/10 text-orange-300"}`}>{state === "NEVER_CHECKED" ? "Never checked" : "Overdue"}</span><Link href={`/admin/apis/${api.slug}/review`} className="text-xs font-bold text-cyan-300 hover:text-cyan-200">Review →</Link></div>
                </div>
              );
            })}
          </div>
        ) : <div className="px-5 py-14 text-center"><p className="text-sm font-bold text-emerald-300">All verified catalogue entries are within the review window.</p><p className="mt-2 text-xs text-slate-500">No records were changed by this report.</p></div>}
      </section>
      <p className="mt-4 text-[11px] leading-5 text-slate-500">Scope: verified APIs in ACTIVE, DEPRECATED, or UNAVAILABLE states. Unverified and archived records are excluded. A review timestamp is an administrator attestation, not an automated reachability check.</p>
    </>
  );
}
