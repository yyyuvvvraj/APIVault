import Link from "next/link";
import { ApiCard } from "@/components/api-card";
import { CATEGORY_DIRECTORY } from "@/lib/catalogue/constants";
import { parseCatalogueFilters } from "@/lib/catalogue/search";
import { listApis } from "@/lib/catalogue/queries";

export const dynamic = "force-dynamic";

const menuLinks = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/apis", label: "Explore APIs", icon: "◫" },
  { href: "/discover", label: "Discovery Queue", icon: "⌕" },
  { href: "https://github.com/yyyuvvvraj/APIVault", label: "Repository", icon: "⌘" },
  { href: "https://github.com/yyyuvvvraj/APIVault/discussions", label: "Community", icon: "◉" },
];

export default async function HomePage() {
  const result = await listApis(parseCatalogueFilters({}));
  const apis = result.databaseStatus === "ready" ? result.items.slice(0, 6) : [];

  return (
    <div className="min-h-screen bg-[#0b0c0f] text-slate-100">
        <main className="min-w-0 flex-1 px-5 py-7 sm:px-8 lg:px-10">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <div className="lg:hidden"><span className="text-xl font-black tracking-[-0.07em]"><span className="text-rose-500">API</span>VAULT</span></div>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-3 text-xs font-semibold">
              <a href="https://github.com/yyyuvvvraj/APIVault" target="_blank" rel="noreferrer" className="text-slate-400 transition hover:text-white">⌘ GitHub ↗</a>
              <a href="https://github.com/yyyuvvvraj/APIVault/issues/new?template=api_submission.yml" target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3.5 py-2 text-slate-200 transition hover:border-white/20 hover:bg-white/5">＋ Submit API</a>
            </div>
          </div>
          <section>
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.22em] text-rose-400">The developer API directory</p>
            <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight text-white sm:text-[42px]">Your gateway to a world of public APIs.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Discover useful APIs, compare how they work, and build better applications with reliable source-backed information.</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Community curated · Source linked · Open source</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/apis" className="rounded-lg bg-rose-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-rose-500">Explore verified APIs</Link>
              <Link href="/discover" className="rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-4 py-2.5 text-xs font-extrabold text-amber-200 hover:bg-amber-400/10">Browse 2,284 discovery leads ↗</Link>
            </div>
          </section>
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">Trending categories</h2>
              <Link href="/apis" className="text-[11px] font-bold text-rose-400 hover:text-rose-300">Browse all →</Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_DIRECTORY.slice(0, 8).map((category) => (
                <Link key={category.slug} href={`/apis?category=${category.slug}`} className="rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-[11px] font-semibold text-slate-300 transition hover:border-rose-400/30 hover:bg-rose-400/10 hover:text-white">{category.name}</Link>
              ))}
            </div>
          </section>
          <form action="/apis" method="get" role="search" className="mt-6 flex w-full max-w-4xl items-center gap-3 rounded-xl border border-white/[0.09] bg-[#15171b] px-4 py-3 focus-within:border-rose-400/40">
            <span className="text-slate-500">⌕</span>
            <label htmlFor="homepage-search" className="sr-only">Search APIs</label>
            <input id="homepage-search" name="q" type="search" placeholder="Search APIs, providers, or capabilities..." className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
            <button type="submit" className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-rose-500">Search</button>
          </form>
          <section className="mt-10">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div><h2 className="text-lg font-extrabold tracking-tight text-white">Featured APIs</h2><p className="mt-1 text-xs text-slate-500">Verified listings, with sources and integration details.</p></div>
              <Link href="/apis" className="text-xs font-bold text-slate-400 hover:text-white">View catalogue →</Link>
            </div>
            {apis.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{apis.map((api) => <ApiCard key={api.id} api={api} />)}</div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.025] px-6 py-12 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-lg font-black text-rose-300">AV</div>
                <h3 className="mt-4 text-base font-extrabold text-white">The catalogue is ready for its first APIs.</h3>
                <p className="mx-auto mt-2 max-w-lg text-xs leading-6 text-slate-500">We only publish active, verified listings. Help us get started by suggesting an API with official documentation and source links.</p>
                <a href="https://github.com/yyyuvvvraj/APIVault/issues/new?template=api_submission.yml" target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-lg bg-rose-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-rose-500">Suggest the first API ↗</a>
              </div>
            )}
          </section>
          <div className="mt-10 border-t border-white/[0.07] pt-5 text-[11px] text-slate-600">APIVault is open source. Listings are published only after verification against reliable sources.</div>
        </main>
    </div>
  );
}
