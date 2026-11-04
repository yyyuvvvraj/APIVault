import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getApiBySlug } from "@/lib/catalogue/queries";
import { CATALOGUE_REVIEW_INTERVAL_DAYS, getCatalogueFreshnessState, getCatalogueReviewDueAt } from "@/lib/catalogue/freshness";

type PageProps = { params: Promise<{ slug: string }> };

const pricingLabels: Record<string, string> = {
  FREE: "Free",
  FREEMIUM: "Freemium",
  PAID: "Paid",
  OPEN_SOURCE: "Open source",
  UNKNOWN: "Not yet known",
};

function dateLabel(value: Date | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(value);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getApiBySlug(slug);
  if (result.databaseStatus === "missing") return { title: "Catalogue setup" };
  if (!result.api) return { title: "API not found" };
  return { title: result.api.name, description: result.api.summary };
}

export default async function ApiDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getApiBySlug(slug);

  if (result.databaseStatus === "missing") {
    return (
      <div className="mx-auto max-w-4xl px-5 py-20 sm:px-8">
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6">
          <h1 className="text-xl font-extrabold text-amber-200">Catalogue database not configured</h1>
          <p className="mt-2 text-sm text-amber-100/70">Follow the local development guide to start PostgreSQL and apply the initial schema.</p>
          <a href="https://github.com/yyyuvvvraj/APIVault/blob/dev/docs/LOCAL_DEVELOPMENT.md" className="mt-3 inline-block text-sm font-bold underline">Local setup guide ↗</a>
        </div>
      </div>
    );
  }

  if (!result.api) notFound();
  const api = result.api;
  const freshnessState = getCatalogueFreshnessState(api.lastCheckedAt, new Date());
  const reviewDueAt = api.lastCheckedAt ? getCatalogueReviewDueAt(api.lastCheckedAt) : null;
  const freshnessLabel = freshnessState === "OVERDUE"
    ? "Review overdue"
    : freshnessState === "NEVER_CHECKED"
      ? "Review not recorded"
      : "Review current";
  const freshnessClass = freshnessState === "OVERDUE"
    ? "bg-amber-400/10 text-amber-300"
    : freshnessState === "NEVER_CHECKED"
      ? "bg-slate-400/10 text-slate-300"
      : "bg-emerald-400/10 text-emerald-300";

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <Link href="/apis" className="text-sm font-bold text-rose-400 hover:text-rose-300">← Back to catalogue</Link>
      <div className="mt-7 rounded-3xl border border-white/[0.08] bg-[#14171d] p-7 shadow-none sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-2xl font-black text-rose-400">{api.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{api.provider.name}</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-white">{api.name}</h1>
            </div>
          </div>
          <span className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300">Verified listing</span>
        </div>
        <p className="mt-7 max-w-3xl text-base leading-8 text-slate-300">{api.summary}</p>
        {api.description && <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-300">{api.description}</p>}
        <div className="mt-7 flex flex-wrap gap-3">
          <a href={api.homepageUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-500">Official website ↗</a>
          {api.documentationUrl && <a href={api.documentationUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/5">Documentation ↗</a>}
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.08] bg-[#14171d] p-6">
          <h2 className="font-extrabold text-white">Integration details</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Base URL</dt><dd className="mt-1 break-all text-slate-200">{api.baseUrl ?? "Not recorded"}</dd></div>
            <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Pricing</dt><dd className="mt-1 font-semibold text-slate-200">{pricingLabels[api.pricingModel]}</dd><dd className="mt-1 text-slate-400">{api.pricingSummary ?? "No pricing details have been verified."}</dd></div>
            <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Authentication</dt><dd className="mt-1 text-slate-200">{api.authMethods.length ? api.authMethods.map((item) => item.method.replaceAll("_", " ")).join(", ") : "Not recorded"}</dd></div>
            <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Categories</dt><dd className="mt-1 text-slate-200">{api.categories.map(({ category }) => category.name).join(", ") || "Uncategorized"}</dd></div>
            <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Tags</dt><dd className="mt-1 text-slate-200">{api.tags.map(({ tag }) => tag.name).join(", ") || "No tags"}</dd></div>
          </dl>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[#14171d] p-6">
          <h2 className="font-extrabold text-white">Verification & sources</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Last verified</dt><dd className="mt-1 text-slate-200">{dateLabel(api.verifiedAt)}</dd></div>
            <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Last checked</dt><dd className="mt-1 text-slate-200">{dateLabel(api.lastCheckedAt)}</dd></div>
            <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Catalogue review</dt><dd className="mt-1"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${freshnessClass}`}>{freshnessLabel}</span></dd></div>
            <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Next review due</dt><dd className="mt-1 text-slate-200">{reviewDueAt ? dateLabel(reviewDueAt) : "Not scheduled"}</dd></div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-slate-500">Review status follows a {CATALOGUE_REVIEW_INTERVAL_DAYS}-day catalogue review cadence. It reflects the last recorded maintainer review, not live API availability or an uptime guarantee.</p>
          <ul className="mt-5 space-y-3">
            {api.sources.map((source) => (
              <li key={source.id} className="border-t border-white/[0.06] pt-3">
                <a href={source.url} target="_blank" rel="noreferrer" className="break-all text-sm font-semibold text-rose-400 hover:underline">{source.title ?? source.sourceKind.replaceAll("_", " ")} ↗</a>
                <p className="mt-1 text-xs text-slate-400">Checked {dateLabel(source.checkedAt)}{source.isOfficial ? " · Official source" : ""}</p>
              </li>
            ))}
            {!api.sources.length && <li className="text-sm text-slate-400">No supporting sources recorded.</li>}
          </ul>
        </section>
      </div>

      {api.rateLimits.length > 0 && (
        <section className="mt-6 rounded-2xl border border-white/[0.08] bg-[#14171d] p-6">
          <h2 className="font-extrabold text-white">Rate limits</h2>
          <ul className="mt-4 space-y-3">
            {api.rateLimits.map((limit) => <li key={limit.id} className="text-sm text-slate-300">{limit.description}{limit.scope ? ` · ${limit.scope}` : ""}{limit.source && <a href={limit.source.url} className="ml-2 font-semibold text-rose-400" target="_blank" rel="noreferrer">Source ↗</a>}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
