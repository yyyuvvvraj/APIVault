import Link from "next/link";
import {
  ApiStatus,
  VerificationStatus,
  SubmissionStatus,
} from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";

function MetricCard({ label, value, note, accent }: { label: string; value: number; note: string; accent: string }) {
  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#10151e] p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <span className={`h-2 w-2 rounded-full ${accent}`} />
      </div>
      <p className="mt-4 text-3xl font-black tracking-tight text-white">{value.toLocaleString("en-IN")}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </article>
  );
}

function dateLabel(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(value);
}

export default async function AdminDashboardPage() {
  const db = getPrisma();
  const [
    totalApis,
    verifiedApis,
    pendingSubmissions,
    totalCategories,
    recentApis,
    recentSubmissions,
  ] = await Promise.all([
    db.api.count(),
    db.api.count({ where: { verificationStatus: VerificationStatus.VERIFIED, status: ApiStatus.ACTIVE } }),
    db.apiSubmission.count({ where: { status: { in: [SubmissionStatus.PENDING, SubmissionStatus.IN_REVIEW] } } }),
    db.category.count(),
    db.api.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, slug: true, status: true, verificationStatus: true, updatedAt: true, provider: { select: { name: true } } },
    }),
    db.apiSubmission.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, kind: true, status: true, submitterName: true, submitterGithub: true, createdAt: true },
    }),
  ]);

  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-rose-400">Workspace / Overview</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-400">A live view of catalogue health and community activity.</p>
        </div>
        <Link href="/admin/apis" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/[0.08]">Manage catalogue ↗</Link>
      </header>

      <section aria-label="Catalogue statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total APIs" value={totalApis} note="All catalogue records" accent="bg-sky-400" />
        <MetricCard label="Verified & active" value={verifiedApis} note="Visible in the public catalogue" accent="bg-emerald-400" />
        <MetricCard label="Needs review" value={pendingSubmissions} note="Pending or being reviewed" accent="bg-amber-400" />
        <MetricCard label="Categories" value={totalCategories} note="Available catalogue categories" accent="bg-rose-400" />
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#10151e]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
            <div>
              <h2 className="text-sm font-extrabold text-white">Recently updated APIs</h2>
              <p className="mt-1 text-xs text-slate-500">Latest catalogue changes</p>
            </div>
            <Link href="/admin/apis" className="text-xs font-bold text-rose-400 hover:text-rose-300">View all →</Link>
          </div>
          {recentApis.length ? (
            <div className="divide-y divide-white/[0.06]">
              {recentApis.map((api) => (
                <div key={api.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-100">{api.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{api.provider.name} · Updated {dateLabel(api.updatedAt)}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{api.verificationStatus.replaceAll("_", " ")}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-bold text-slate-300">The catalogue is ready for its first listing.</p>
              <p className="mt-2 text-xs text-slate-500">Add an API when the create/edit workflow is enabled.</p>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#10151e]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
            <div>
              <h2 className="text-sm font-extrabold text-white">Community submissions</h2>
              <p className="mt-1 text-xs text-slate-500">Most recent intake activity</p>
            </div>
            <Link href="/admin/submissions" className="text-xs font-bold text-rose-400 hover:text-rose-300">Review queue →</Link>
          </div>
          {recentSubmissions.length ? (
            <div className="divide-y divide-white/[0.06]">
              {recentSubmissions.map((submission) => (
                <div key={submission.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-100">{submission.kind === "CREATE" ? "New API suggestion" : "API update"}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{submission.submitterName || submission.submitterGithub || "Community member"} · {dateLabel(submission.createdAt)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-300">{submission.status.replaceAll("_", " ")}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-bold text-slate-300">No submissions yet.</p>
              <p className="mt-2 text-xs text-slate-500">Community suggestions will appear here once intake is connected.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
