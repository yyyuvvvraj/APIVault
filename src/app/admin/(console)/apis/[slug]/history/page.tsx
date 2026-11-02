import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";

export const metadata = { title: "API revision history" };
type PageProps = { params: Promise<{ slug: string }> };

const actionTone: Record<string, string> = {
  CREATED: "bg-sky-400/10 text-sky-300",
  UPDATED: "bg-violet-400/10 text-violet-300",
  VERIFIED: "bg-emerald-400/10 text-emerald-300",
  STATUS_CHANGED: "bg-amber-400/10 text-amber-300",
  ARCHIVED: "bg-rose-400/10 text-rose-300",
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

export default async function AdminApiHistoryPage({ params }: PageProps) {
  const { slug } = await params;
  const api = await getPrisma().api.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      provider: { select: { name: true } },
      revisions: {
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          action: true,
          actorGithub: true,
          summary: true,
          snapshot: true,
          createdAt: true,
        },
      },
    },
  });

  if (!api) notFound();

  return (
    <>
      <header className="mb-7">
        <Link href="/admin/apis" className="text-xs font-semibold text-slate-500 hover:text-white">← Back to API catalogue</Link>
        <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.22em] text-rose-400">Workspace / Audit trail</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">{api.name}</h1>
        <p className="mt-2 text-sm text-slate-400">{api.provider.name} · /{api.slug}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={`/admin/apis/${api.slug}/edit`} className="text-xs font-bold text-cyan-300 hover:text-cyan-200">Edit API →</Link>
          <Link href={`/admin/apis/${api.slug}/review`} className="text-xs font-bold text-amber-300 hover:text-amber-200">Verification review →</Link>
        </div>
      </header>

      <section className="mb-5 rounded-2xl border border-white/[0.08] bg-[#10151e] p-5">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-sm font-extrabold text-white">Revision history</h2><p className="mt-1 text-xs text-slate-500">Immutable snapshots captured when catalogue changes are applied.</p></div>
          <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300">{api.revisions.length} events</span>
        </div>
      </section>

      <div className="space-y-3">
        {api.revisions.map((revision) => (
          <article key={revision.id} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#10151e]">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
              <div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${actionTone[revision.action] ?? "bg-slate-400/10 text-slate-300"}`}>{revision.action.replaceAll("_", " ")}</span>
                <p className="mt-2 text-sm font-semibold text-slate-100">{revision.summary || "Catalogue revision"}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDate(revision.createdAt)}{revision.actorGithub ? ` · @${revision.actorGithub}` : " · Admin action"}</p>
              </div>
              <span className="text-[10px] font-mono text-slate-600">{revision.id.slice(0, 8)}</span>
            </div>
            <details className="group">
              <summary className="cursor-pointer list-none px-5 py-3 text-xs font-bold text-cyan-300 hover:bg-white/[0.025]">
                <span className="group-open:hidden">View revision snapshot ↓</span>
                <span className="hidden group-open:inline">Hide revision snapshot ↑</span>
              </summary>
              <pre className="max-h-[480px] overflow-auto border-t border-white/[0.07] bg-black/20 p-5 text-xs leading-5 text-slate-300">{JSON.stringify(revision.snapshot, null, 2)}</pre>
            </details>
          </article>
        ))}
        {!api.revisions.length && (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
            <p className="text-sm font-bold text-slate-300">No revisions recorded yet.</p>
            <p className="mt-2 text-xs text-slate-500">The first revision is created when this API is added or changed through the admin workflow.</p>
          </div>
        )}
      </div>
    </>
  );
}
