import Link from "next/link";
import { ApiCard } from "@/components/api-card";
import { CATEGORY_DIRECTORY, AUTH_OPTIONS, PRICING_OPTIONS } from "@/lib/catalogue/constants";
import { parseCatalogueFilters } from "@/lib/catalogue/search";
import { listApis } from "@/lib/catalogue/queries";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata = { title: "Explore APIs" };

export default async function ApisPage({ searchParams }: PageProps) {
  const filters = parseCatalogueFilters(await searchParams);
  const result = await listApis(filters);

  return (
    <div className="min-h-screen bg-[#0b0c0f] px-5 py-12 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-9">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-rose-400">The catalogue</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-white">Explore APIs</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Search verified listings and narrow results by category, pricing, and authentication.</p>
        </div>

        <form action="/apis" method="get" className="mb-8 grid gap-3 rounded-2xl border border-white/[0.08] bg-[#14171d] p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2 lg:col-span-2">
            <label htmlFor="q" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Search</label>
            <input id="q" name="q" type="search" defaultValue={filters.q} placeholder="API name, provider, capability..." className="w-full rounded-lg border border-white/10 bg-[#0c0f14] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-rose-400/50" />
          </div>
          <div>
            <label htmlFor="category" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Category</label>
            <select id="category" name="category" defaultValue={filters.category} className="w-full rounded-lg border border-white/10 bg-[#0c0f14] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-rose-400/50">
              <option value="">All categories</option>
              {CATEGORY_DIRECTORY.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pricing" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Pricing</label>
            <select id="pricing" name="pricing" defaultValue={filters.pricing} className="w-full rounded-lg border border-white/10 bg-[#0c0f14] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-rose-400/50">
              <option value="ALL">Any pricing</option>
              {PRICING_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="auth" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Authentication</label>
            <select id="auth" name="auth" defaultValue={filters.auth} className="w-full rounded-lg border border-white/10 bg-[#0c0f14] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-rose-400/50">
              <option value="ALL">Any method</option>
              {AUTH_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
            <button type="submit" className="rounded-lg bg-rose-600 px-5 py-2.5 text-xs font-extrabold text-white transition hover:bg-rose-500">Apply filters</button>
            <Link href="/apis" className="rounded-lg border border-white/10 px-5 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/5">Clear</Link>
          </div>
        </form>

        {result.databaseStatus === "missing" ? (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6">
            <h2 className="font-extrabold text-amber-200">Catalogue database is not connected yet</h2>
            <p className="mt-2 text-sm leading-6 text-amber-100/70">Copy <code>.env.example</code> to <code>.env</code>, start PostgreSQL with <code>docker compose up -d</code>, then run the migration and seed commands in the local development guide.</p>
            <a href="https://github.com/yyyuvvvraj/APIVault/blob/dev/docs/LOCAL_DEVELOPMENT.md" className="mt-3 inline-block text-sm font-bold text-amber-200 underline">Read local setup instructions ↗</a>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">{result.total} verified {result.total === 1 ? "API" : "APIs"} found</p>
              <form action="/apis" method="get" className="flex items-center gap-2 text-xs">
                {filters.q && <input type="hidden" name="q" value={filters.q} />}
                {filters.category && <input type="hidden" name="category" value={filters.category} />}
                {filters.pricing !== "ALL" && <input type="hidden" name="pricing" value={filters.pricing} />}
                {filters.auth !== "ALL" && <input type="hidden" name="auth" value={filters.auth} />}
                <label htmlFor="sort" className="text-slate-500">Sort</label>
                <select id="sort" name="sort" defaultValue={filters.sort} className="rounded-lg border border-white/10 bg-[#14171d] px-2 py-1.5 font-semibold text-slate-300">
                  <option value="relevance">Featured</option>
                  <option value="recent">Recently updated</option>
                  <option value="name">Name</option>
                </select>
                <button type="submit" className="rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-bold text-slate-300 hover:bg-white/5">Sort</button>
              </form>
            </div>
            {result.items.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{result.items.map((api) => <ApiCard key={api.id} api={api} />)}</div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.025] px-6 py-16 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-lg font-black text-rose-300">AV</div>
                <h2 className="mt-4 text-xl font-extrabold text-white">No verified APIs match yet</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">The catalogue is being curated. Suggest an API with official sources and help us make the first listings useful and trustworthy.</p>
                <a href="https://github.com/yyyuvvvraj/APIVault/issues/new?template=api_submission.yml" target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-lg bg-rose-600 px-5 py-3 text-xs font-extrabold text-white hover:bg-rose-500">Suggest the first API ↗</a>
              </div>
            )}
            {result.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                {filters.page > 1 ? <Link href={`/apis?q=${encodeURIComponent(filters.q)}&category=${filters.category}&pricing=${filters.pricing}&auth=${filters.auth}&sort=${filters.sort}&page=${filters.page - 1}`} className="text-sm font-bold text-rose-400">← Previous</Link> : <span />}
                <span className="text-xs font-semibold text-slate-500">Page {filters.page} of {result.totalPages}</span>
                {filters.page < result.totalPages ? <Link href={`/apis?q=${encodeURIComponent(filters.q)}&category=${filters.category}&pricing=${filters.pricing}&auth=${filters.auth}&sort=${filters.sort}&page=${filters.page + 1}`} className="text-sm font-bold text-rose-400">Next →</Link> : <span />}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
