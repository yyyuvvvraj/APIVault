import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { AdminApiLifecycleControls } from "@/components/admin-api-lifecycle-controls";

export const metadata = { title: "Verify API" };
type PageProps = { params: Promise<{ slug: string }> };

export default async function AdminApiReviewPage({ params }: PageProps) {
  const { slug } = await params;
  const api = await getPrisma().api.findUnique({
    where: { slug },
    include: {
      provider: { select: { name: true } },
      sources: { select: { id: true, sourceKind: true, url: true, isOfficial: true, checkedAt: true } },
      categories: { include: { category: { select: { name: true, slug: true } } } },
      authMethods: { select: { method: true, details: true } },
    },
  });

  if (!api) notFound();

  return (
    <>
      <header className="mb-7">
        <Link href="/admin/apis" className="text-xs font-semibold text-slate-500 hover:text-white">← Back to API catalogue</Link>
        <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.22em] text-rose-400">Workspace / Verification</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">{api.name}</h1>
        <p className="mt-2 text-sm text-slate-400">{api.provider.name} · /{api.slug}</p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-white/[0.08] bg-[#10151e] p-5 sm:p-6">
          <h2 className="text-sm font-extrabold text-white">Verification evidence</h2>
          <p className="mt-1 text-xs text-slate-500">Review official source links before publishing.</p>
          <dl className="mt-5 space-y-4">
            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Summary</dt><dd className="mt-1 text-sm leading-6 text-slate-200">{api.summary}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Categories</dt><dd className="mt-1 text-xs text-slate-300">{api.categories.map((item) => item.category.name).join(", ") || "None"}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Authentication</dt><dd className="mt-1 text-xs text-slate-300">{api.authMethods.map((item) => item.method.replaceAll("_", " ")).join(", ") || "Unknown"}</dd></div>
            <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Evidence sources</dt><dd className="mt-2 space-y-2">{api.sources.map((source) => <div key={source.id} className="rounded-lg bg-black/20 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{source.sourceKind.replaceAll("_", " ")}{source.isOfficial ? " · Official" : ""}</p><a href={source.url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs font-semibold text-cyan-300 hover:underline">{source.url}</a></div>)}</dd></div>
          </dl>
          <Link href={`/admin/apis/${api.slug}/edit`} className="mt-5 inline-block text-xs font-bold text-cyan-300 hover:text-cyan-200">Edit catalogue details →</Link>
        </section>
        <AdminApiLifecycleControls apiId={api.id} status={api.status} verificationStatus={api.verificationStatus} publishedAt={api.publishedAt?.toISOString() ?? null}/>
      </div>
    </>
  );
}
