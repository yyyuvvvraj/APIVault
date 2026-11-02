import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getApiBySlug } from "@/lib/catalogue/queries";

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
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-xl font-extrabold text-amber-950">Catalogue database not configured</h1>
          <p className="mt-2 text-sm text-amber-900">Follow the local development guide to start PostgreSQL and apply the initial schema.</p>
          <a href="https://github.com/yyyuvvvraj/APIVault/blob/dev/docs/LOCAL_DEVELOPMENT.md" className="mt-3 inline-block text-sm font-bold underline">Local setup guide ↗</a>
        </div>
      </div>
    );
  }

  if (!result.api) notFound();
  const api = result.api;

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <Link href="/apis" className="text-sm font-bold text-indigo-700 hover:text-indigo-900">← Back to catalogue</Link>
      <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl font-black text-indigo-700">{api.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{api.provider.name}</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">{api.name}</h1>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Verified listing</span>
        </div>
        <p className="mt-7 max-w-3xl text-base leading-8 text-slate-600">{api.summary}</p>
        {api.description && <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">{api.description}</p>}
        <div className="mt-7 flex flex-wrap gap-3">
          <a href={api.homepageUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Official website ↗</a>
          {api.documentationUrl && <a href={api.documentationUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Documentation ↗</a>}
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-extrabold text-slate-950">Integration details</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Base URL</dt><dd className="mt-1 break-all text-slate-700">{api.baseUrl ?? "Not recorded"}</dd></div>
            <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Pricing</dt><dd className="mt-1 font-semibold text-slate-700">{pricingLabels[api.pricingModel]}</dd><dd className="mt-1 text-slate-500">{api.pricingSummary ?? "No pricing details have been verified."}</dd></div>
            <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Authentication</dt><dd className="mt-1 text-slate-700">{api.authMethods.length ? api.authMethods.map((item) => item.method.replaceAll("_", " ")).join(", ") : "Not recorded"}</dd></div>
            <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Categories</dt><dd className="mt-1 text-slate-700">{api.categories.map(({ category }) => category.name).join(", ") || "Uncategorized"}</dd></div>
            <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Tags</dt><dd className="mt-1 text-slate-700">{api.tags.map(({ tag }) => tag.name).join(", ") || "No tags"}</dd></div>
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-extrabold text-slate-950">Verification & sources</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Last verified</dt><dd className="mt-1 text-slate-700">{dateLabel(api.verifiedAt)}</dd></div>
            <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Last checked</dt><dd className="mt-1 text-slate-700">{dateLabel(api.lastCheckedAt)}</dd></div>
          </dl>
          <ul className="mt-5 space-y-3">
            {api.sources.map((source) => (
              <li key={source.id} className="border-t border-slate-100 pt-3">
                <a href={source.url} target="_blank" rel="noreferrer" className="break-all text-sm font-semibold text-indigo-700 hover:underline">{source.title ?? source.sourceKind.replaceAll("_", " ")} ↗</a>
                <p className="mt-1 text-xs text-slate-500">Checked {dateLabel(source.checkedAt)}{source.isOfficial ? " · Official source" : ""}</p>
              </li>
            ))}
            {!api.sources.length && <li className="text-sm text-slate-500">No supporting sources recorded.</li>}
          </ul>
        </section>
      </div>

      {api.rateLimits.length > 0 && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-extrabold text-slate-950">Rate limits</h2>
          <ul className="mt-4 space-y-3">
            {api.rateLimits.map((limit) => <li key={limit.id} className="text-sm text-slate-600">{limit.description}{limit.scope ? ` · ${limit.scope}` : ""}{limit.source && <a href={limit.source.url} className="ml-2 font-semibold text-indigo-700" target="_blank" rel="noreferrer">Source ↗</a>}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
