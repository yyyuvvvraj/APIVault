import Link from "next/link";
import { getPrisma } from "@/lib/db";
import type { Prisma, DiscoveryLead } from "@/generated/prisma/client";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
const priorityStyles: Record<string, string> = {
  HIGH: "border-rose-400/20 bg-rose-400/10 text-rose-300",
  NORMAL: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  LOW: "border-white/10 bg-white/5 text-slate-400",
};

type ResearchLink = { kind?: string; url?: string; linkText?: string };
type ResearchSnapshot = {
  hostname?: string;
  research?: {
    fetchStatus?: string;
    httpStatus?: number | null;
    resolvedUrl?: string | null;
    title?: string;
    description?: string;
    candidateLinks?: ResearchLink[];
    error?: string | null;
    observedAt?: string;
    elapsedMs?: number;
  };
};
function getResearch(value: Prisma.JsonValue | null): ResearchSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as unknown as ResearchSnapshot;
}

export const metadata = {
  title: "Discover APIs",
  description: "Explore the APIVault discovery queue, research evidence, and maintainer review status.",
};

export default async function DiscoverPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = first(params.q).trim().slice(0, 100);
  const priority = ["HIGH", "NORMAL", "LOW"].includes(first(params.priority)) ? first(params.priority) : "";
  const disposition = ["READY_FOR_MAINTAINER_REVIEW", "REVIEW_REQUIRED"].includes(first(params.disposition)) ? first(params.disposition) : "";
  const category = first(params.category).trim().slice(0, 120);
  const rawPage = Number.parseInt(first(params.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.min(rawPage, 10000) : 1;
  const limit = 30;
  const where: Prisma.DiscoveryLeadWhereInput = {
    ...(priority ? { priority } : {}),
    ...(disposition ? { disposition } : {}),
    ...(category ? { suggestedCategory: category } : {}),
    ...(q ? { OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { originalUrl: { contains: q, mode: "insensitive" as const } },
      { canonicalUrl: { contains: q, mode: "insensitive" as const } },
      { sourceCategory: { contains: q, mode: "insensitive" as const } },
      { suggestedCategory: { contains: q, mode: "insensitive" as const } },
    ] } : {}),
  };

  let total = 0;
  let filteredTotal = 0;
  let high = 0;
  let ready = 0;
  let leads: DiscoveryLead[] = [];
  let categories: { suggestedCategory: string | null }[] = [];
  let databaseUnavailable = false;
  try {
    const prisma = getPrisma();
    [total, filteredTotal, high, ready, leads, categories] = await Promise.all([
      prisma.discoveryLead.count(),
      prisma.discoveryLead.count({ where }),
      prisma.discoveryLead.count({ where: { priority: "HIGH" } }),
      prisma.discoveryLead.count({ where: { disposition: "READY_FOR_MAINTAINER_REVIEW" } }),
      prisma.discoveryLead.findMany({ where, orderBy: [{ priority: "asc" }, { name: "asc" }], skip: (page - 1) * limit, take: limit }),
      prisma.discoveryLead.findMany({ distinct: ["suggestedCategory"], select: { suggestedCategory: true }, orderBy: { suggestedCategory: "asc" } }),
    ]);
  } catch (error) {
    console.error("Discovery catalogue query failed:", error);
    databaseUnavailable = true;
  }
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (priority) query.set("priority", priority);
  if (disposition) query.set("disposition", disposition);
  if (category) query.set("category", category);
  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(nextPage));
    return `/discover?${next.toString()}`;
  };

  return (
    <main className="min-h-screen bg-[#0b0c0f] px-5 py-12 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-rose-400">Open discovery queue</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-white">Discover APIs</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Explore every provider lead gathered for APIVault. Discovery entries are research candidates, not verified API listings. Help maintainers review official documentation, access rules, pricing, and terms.</p>
        </div>
        {databaseUnavailable ? (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6">
            <h2 className="font-extrabold text-amber-200">Discovery catalogue is temporarily unavailable</h2>
            <p className="mt-2 text-sm leading-6 text-amber-100/70">The catalogue database could not be reached. Please retry in a moment; verified API browsing remains separate from this research queue.</p>
            <Link href="/" className="mt-4 inline-flex rounded-lg border border-white/10 px-4 py-2 text-xs font-bold text-slate-200">Return to APIVault</Link>
          </div>
        ) : (
          <>
            <section className="mb-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/[0.08] bg-[#14171d] p-4"><p className="text-xs font-semibold text-slate-500">Discovery leads</p><p className="mt-2 text-3xl font-black text-white tabular-nums">{total.toLocaleString("en-IN")}</p></div>
              <div className="rounded-xl border border-white/[0.08] bg-[#14171d] p-4"><p className="text-xs font-semibold text-slate-500">High priority</p><p className="mt-2 text-3xl font-black text-rose-300 tabular-nums">{high.toLocaleString("en-IN")}</p></div>
              <div className="rounded-xl border border-white/[0.08] bg-[#14171d] p-4"><p className="text-xs font-semibold text-slate-500">Ready for maintainer review</p><p className="mt-2 text-3xl font-black text-emerald-300 tabular-nums">{ready.toLocaleString("en-IN")}</p></div>
            </section>
            <form action="/discover" method="get" className="mb-6 grid gap-3 rounded-2xl border border-white/[0.08] bg-[#14171d] p-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="lg:col-span-2"><label htmlFor="q" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Search leads</label><input id="q" name="q" defaultValue={q} placeholder="API, provider, URL, category..." className="w-full rounded-lg border border-white/10 bg-[#0c0f14] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-rose-400/50" /></div>
              <div><label htmlFor="priority" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Priority</label><select id="priority" name="priority" defaultValue={priority} className="w-full rounded-lg border border-white/10 bg-[#0c0f14] px-3 py-2.5 text-sm text-slate-200"><option value="">All priorities</option><option value="HIGH">High</option><option value="NORMAL">Normal</option><option value="LOW">Low</option></select></div>
              <div><label htmlFor="category" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Suggested category</label><select id="category" name="category" defaultValue={category} className="w-full rounded-lg border border-white/10 bg-[#0c0f14] px-3 py-2.5 text-sm text-slate-200"><option value="">All categories</option>{categories.filter((item) => item.suggestedCategory).map((item) => <option key={item.suggestedCategory} value={item.suggestedCategory!}>{item.suggestedCategory}</option>)}</select></div>
              <div><label htmlFor="disposition" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Review status</label><select id="disposition" name="disposition" defaultValue={disposition} className="w-full rounded-lg border border-white/10 bg-[#0c0f14] px-3 py-2.5 text-sm text-slate-200"><option value="">All statuses</option><option value="READY_FOR_MAINTAINER_REVIEW">Ready for review</option><option value="REVIEW_REQUIRED">Review required</option></select></div>
              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5"><button type="submit" className="rounded-lg bg-rose-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-rose-500">Apply filters</button><Link href="/discover" className="rounded-lg border border-white/10 px-5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/5">Clear</Link></div>
            </form>
            <div className="mb-4 flex items-center justify-between"><p className="text-xs text-slate-500">Showing {leads.length.toLocaleString("en-IN")} of {filteredTotal.toLocaleString("en-IN")} matching leads</p><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">All discovery leads remain unverified</p></div>
            <div className="grid gap-3">
              {leads.map((lead) => {
                const research = getResearch(lead.automatedResearch);
                const snapshot = research?.research;
                const candidateLinks = Array.isArray(snapshot?.candidateLinks) ? snapshot.candidateLinks.filter((item): item is ResearchLink & { url: string } => typeof item.url === "string" && /^https?:\/\//i.test(item.url)).slice(0, 8) : [];
                return (
                  <article key={lead.reviewId} className="rounded-xl border border-white/[0.08] bg-[#14171d] p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2"><span className={`rounded-md border px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${priorityStyles[lead.priority] ?? priorityStyles.LOW}`}>{lead.priority} priority</span><span className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[10px] font-bold text-amber-200">Unverified</span></div>
                        <h2 className="text-base font-extrabold text-white">{lead.name}</h2>
                        <p className="mt-1 break-all text-xs text-slate-500">{lead.canonicalUrl}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-400">{lead.suggestedCategory && <span className="rounded-md bg-white/[0.06] px-2 py-1">{lead.suggestedCategory}</span>}{lead.sourceCategory && <span className="rounded-md bg-white/[0.04] px-2 py-1">Source: {lead.sourceCategory}</span>}<span className="rounded-md bg-white/[0.04] px-2 py-1">{lead.disposition === "READY_FOR_MAINTAINER_REVIEW" ? "Ready for maintainer review" : "Review required"}</span></div>
                        {Array.isArray(lead.evidenceIssues) && lead.evidenceIssues.length > 0 && <p className="mt-3 text-xs leading-5 text-slate-500">{(lead.evidenceIssues as string[]).slice(0, 2).join(" · ")}</p>}
                        <section className="mt-4 rounded-lg border border-white/[0.07] bg-[#0c0f14] p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Automated research</h3><span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${snapshot?.fetchStatus === "FETCHED" ? "border-sky-400/20 bg-sky-400/10 text-sky-200" : "border-amber-400/20 bg-amber-400/10 text-amber-200"}`}>{snapshot?.fetchStatus ?? "Not researched"}</span></div>
                          {snapshot?.title && <p className="mt-2 text-sm font-bold text-slate-200">{snapshot.title}</p>}
                          {snapshot?.description && <p className="mt-1 text-xs leading-5 text-slate-400">{snapshot.description}</p>}
                          <p className="mt-2 text-[10px] text-slate-500">{research?.hostname ? `Host: ${research.hostname}` : "No hostname available"}{snapshot?.httpStatus ? ` · HTTP ${snapshot.httpStatus}` : ""}{snapshot?.observedAt ? ` · Checked ${new Date(snapshot.observedAt).toLocaleDateString("en-IN")}` : ""}</p>
                          {snapshot?.error && <p className="mt-2 text-xs text-amber-300">Fetch note: {snapshot.error}</p>}
                          {candidateLinks.length > 0 ? <div className="mt-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Candidate evidence links · not authenticated</p><ul className="space-y-1.5">{candidateLinks.map((item, index) => <li key={`${item.url}-${index}`} className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded bg-white/[0.06] px-1.5 py-1 text-[9px] font-bold text-slate-400">{item.kind ?? "LINK"}</span><a href={item.url} target="_blank" rel="noreferrer" className="break-all text-sky-300 hover:text-sky-200">{item.linkText || item.url}</a></li>)}</ul></div> : <p className="mt-2 text-xs text-slate-500">No documentation, pricing, authentication or terms links were detected on the fetched page.</p>}
                          <p className="mt-3 text-[10px] leading-4 text-amber-200/70">Research is automated reconnaissance only. Candidate links do not establish provider ownership, API validity, pricing, terms, or verification.</p>
                        </section>
                      </div>
                      <a href={lead.canonicalUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:border-rose-400/30 hover:text-white">Source ↗</a>
                    </div>
                  </article>
                );
              })}
              {leads.length === 0 && <div className="rounded-2xl border border-dashed border-white/[0.12] px-6 py-16 text-center"><h2 className="text-lg font-extrabold text-white">No discovery leads match</h2><p className="mt-2 text-sm text-slate-500">Try clearing one or more filters.</p></div>}
            </div>
            {filteredTotal > limit && <div className="mt-8 flex items-center justify-between"><span className="text-xs text-slate-500">Page {page} of {Math.ceil(filteredTotal / limit)} · 30 results per page</span><div className="flex gap-3">{page > 1 && <Link href={pageHref(page - 1)} className="text-sm font-bold text-rose-400">← Previous</Link>}{leads.length === limit && <Link href={pageHref(page + 1)} className="text-sm font-bold text-rose-400">Next →</Link>}</div></div>}
          </>
        )}
      </div>
    </main>
  );
}
