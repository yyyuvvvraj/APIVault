import Link from "next/link";
import { ApiCard } from "@/components/api-card";
import { CATEGORY_DIRECTORY } from "@/lib/catalogue/constants";
import { parseCatalogueFilters } from "@/lib/catalogue/search";
import { listApis } from "@/lib/catalogue/queries";

export const dynamic = "force-dynamic";

const categoryArt = [
  "from-red-950 via-[#3b1015] to-[#151515]",
  "from-blue-950 via-[#142d49] to-[#151515]",
  "from-violet-950 via-[#2a1743] to-[#151515]",
  "from-emerald-950 via-[#12372b] to-[#151515]",
  "from-amber-950 via-[#3b2b12] to-[#151515]",
  "from-cyan-950 via-[#12323a] to-[#151515]",
];

export default async function HomePage() {
  const result = await listApis(parseCatalogueFilters({}));
  const apis = result.databaseStatus === "ready" ? result.items.slice(0, 12) : [];
  const featured = apis[0];

  return (
    <main className="av-home min-w-0 overflow-hidden bg-black pb-12 text-white">
      <section className="av-hero relative flex min-h-[570px] items-center overflow-hidden px-6 pb-16 pt-20 sm:min-h-[630px] sm:px-10 lg:min-h-[690px] lg:px-16">
        <div className="av-hero-art absolute inset-0" aria-hidden="true">
          <div className="absolute -right-20 top-0 h-[560px] w-[560px] rounded-full border-[70px] border-[#e50914]/[0.07] blur-[1px]" />
          <div className="absolute right-[8%] top-[12%] h-[390px] w-[390px] rounded-full bg-[#e50914]/[0.10] blur-[110px]" />
          <div className="absolute right-[15%] top-[20%] hidden rotate-[-12deg] rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.09] to-transparent p-8 shadow-2xl backdrop-blur-sm lg:block">
            <div className="grid h-[260px] w-[220px] grid-cols-3 gap-2 opacity-80">{Array.from({length:9},(_,i)=><div key={i} className={`rounded-md ${i%3===0?"bg-[#e50914]/35":"bg-white/[0.07]"}`} />)}</div>
          </div>
        </div>
        <div className="relative z-10 mx-auto w-full max-w-[1600px]">
          <div className="max-w-[760px]">
            <div className="mb-6 flex items-center gap-3"><span className="h-7 w-1 bg-[#e50914]" /><span className="text-xs font-black uppercase tracking-[0.28em] text-[#f0444b]">The developer collection</span></div>
            <h1 className="max-w-[780px] text-[clamp(3.4rem,8vw,7.5rem)] font-black leading-[0.88] tracking-[-0.075em]">Your next<br /><span className="text-[#e50914]">great API</span><br />is here.</h1>
            <p className="mt-8 max-w-xl text-base leading-7 text-neutral-300 sm:text-lg">Discover the building blocks behind your next big idea. Explore useful APIs, compare capabilities, and build with confidence.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/apis" className="inline-flex min-h-12 items-center gap-3 rounded-[4px] bg-white px-6 text-sm font-black text-black transition hover:bg-neutral-200"><span className="text-lg">▶</span> Explore APIs</Link>
              <Link href="/discover" className="inline-flex min-h-12 items-center gap-3 rounded-[4px] bg-white/15 px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/25"><span className="text-lg">ⓘ</span> How discovery works</Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs font-semibold text-neutral-400">
              <span><strong className="mr-2 text-white">01</strong> Community curated</span><span><strong className="mr-2 text-white">02</strong> Source linked</span><span><strong className="mr-2 text-white">03</strong> Verification first</span>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/75 to-transparent" />
      </section>

      <div className="relative z-10 mx-auto -mt-8 max-w-[1720px] space-y-12 px-5 sm:px-8 lg:px-12">
        <section className="av-search-panel rounded-md border border-white/10 bg-[#171717] p-4 sm:p-5">
          <form action="/apis" method="get" role="search" className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="homepage-search" className="sr-only">Search APIs</label>
            <div className="flex min-h-12 flex-1 items-center gap-3 rounded border border-white/10 bg-black/60 px-4"><span className="text-xl text-neutral-500">⌕</span><input id="homepage-search" name="q" type="search" placeholder="Search APIs, providers, categories..." className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-500" /></div>
            <button type="submit" className="min-h-12 rounded bg-[#e50914] px-8 text-sm font-black text-white transition hover:bg-[#f6121d]">Search catalogue</button>
          </form>
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between gap-4"><div><p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#e50914]">Browse by interest</p><h2 className="text-2xl font-black tracking-tight sm:text-3xl">Explore collections</h2></div><Link href="/apis" className="shrink-0 text-xs font-bold text-neutral-400 transition hover:text-white">View all <span className="text-[#e50914]">→</span></Link></div>
          <div className="av-collection-rail flex gap-3 overflow-x-auto pb-4">
            {CATEGORY_DIRECTORY.slice(0,10).map((category,index)=><Link key={category.slug} href={`/apis?category=${category.slug}`} className={`av-category-tile group relative flex h-[145px] min-w-[190px] flex-1 items-end overflow-hidden rounded-md border border-white/10 bg-gradient-to-br ${categoryArt[index%categoryArt.length]} p-4 transition duration-300 hover:-translate-y-1 hover:border-white/40 sm:h-[170px] sm:min-w-[220px]`}><span className="absolute -right-5 -top-8 text-[100px] font-black leading-none text-white/[0.07] transition group-hover:scale-110">{String(index+1).padStart(2,"0")}</span><span className="relative z-10 max-w-[170px] text-lg font-black leading-tight text-white">{category.name}</span></Link>)}
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between gap-4"><div><p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#e50914]">Curated and checked</p><h2 className="text-2xl font-black tracking-tight sm:text-3xl">Featured APIs</h2><p className="mt-1 text-sm text-neutral-400">Listings published after verification against reliable sources.</p></div><Link href="/apis" className="shrink-0 text-xs font-bold text-neutral-400 transition hover:text-white">Explore catalogue <span className="text-[#e50914]">→</span></Link></div>
          {apis.length ? <div className="av-api-rail grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{apis.map(api=><ApiCard key={api.id} api={api}/>)}</div> : <div className="rounded-md border border-white/10 bg-[#171717] px-6 py-14 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-[#e50914] text-xl font-black">AV</div><h3 className="mt-5 text-xl font-black text-white">The catalogue is being curated.</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-neutral-400">APIVault only publishes active, verified APIs. Explore discovery leads or suggest an API with official documentation.</p><Link href="/discover" className="mt-5 inline-flex rounded bg-[#e50914] px-5 py-3 text-xs font-black text-white hover:bg-[#f6121d]">Explore discovery queue</Link></div>}
        </section>

        <section className="av-discovery-banner relative overflow-hidden rounded-md border border-white/10 bg-gradient-to-r from-[#26090d] via-[#171717] to-[#101010] p-6 sm:p-9">
          <div className="absolute -right-10 -top-24 h-72 w-72 rounded-full border-[35px] border-[#e50914]/10" />
          <div className="relative z-10 max-w-2xl"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f0444b]">The next one could be yours</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Help shape the API universe.</h2><p className="mt-3 text-sm leading-6 text-neutral-300">Our discovery queue contains provider leads awaiting maintainer review. Discovery is not verification — every published API must pass the evidence checks.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/discover" className="rounded bg-white px-5 py-3 text-xs font-black text-black hover:bg-neutral-200">Browse discovery queue</Link><a href="https://github.com/yyyuvvvraj/APIVault/issues/new?template=api_submission.yml" target="_blank" rel="noreferrer" className="rounded border border-white/25 px-5 py-3 text-xs font-bold text-white hover:bg-white/10">Submit an API ↗</a></div></div>
        </section>
      </div>
    </main>
  );
}
