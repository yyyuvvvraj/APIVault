import Link from "next/link";
import { SearchForm } from "@/components/search-form";
import { CATEGORY_DIRECTORY } from "@/lib/catalogue/constants";

const principles = [
  { number: "01", title: "Find the right API", description: "Search by capability, provider, category, authentication, or pricing model." },
  { number: "02", title: "Know what you're integrating", description: "Every published listing is designed to show its sources, limits, and last verification." },
  { number: "03", title: "Make the catalogue better", description: "Suggest APIs, correct details, and help other developers discover reliable tools." },
];

export default function HomePage() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-slate-950">
        <div className="pointer-events-none absolute -right-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-64 left-1/4 h-[28rem] w-[28rem] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-indigo-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              The community-built API directory
            </div>
            <h1 className="max-w-4xl text-5xl font-black leading-[1.04] tracking-tight text-white sm:text-7xl">
              Find the API.
              <br />
              <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-cyan-200 bg-clip-text text-transparent">Build the thing.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              Explore a growing catalogue of developer APIs with clear details on capabilities, authentication, pricing, and source evidence.
            </p>
            <div className="mt-9">
              <SearchForm />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-400">
              <span>Community curated</span><span>·</span><span>Source linked</span><span>·</span><span>Open source</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-600">Explore by category</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">A starting point for every build.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Browse the catalogue by the kind of problem you&apos;re solving.</p>
          </div>
          <Link href="/apis" className="text-sm font-bold text-indigo-700 hover:text-indigo-900">Explore all APIs →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {CATEGORY_DIRECTORY.map((category, index) => (
            <Link key={category.slug} href={`/apis?category=${category.slug}`} className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-950/5">
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-indigo-700 group-hover:bg-indigo-50">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="font-bold text-slate-900">{category.name}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">{category.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 md:grid-cols-3">
          {principles.map((item) => (
            <div key={item.number}>
              <p className="text-sm font-black text-indigo-600">{item.number}</p>
              <h3 className="mt-3 text-xl font-extrabold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="flex flex-col justify-between gap-6 rounded-3xl bg-indigo-600 p-8 text-white sm:flex-row sm:items-center sm:p-12">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-100">Built in the open</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">Know an API we should include?</h2>
            <p className="mt-3 text-sm leading-6 text-indigo-100">Help the next developer find it. Suggest an API with its official documentation and source links.</p>
          </div>
          <a href="https://github.com/yyyuvvvraj/APIVault/issues/new?template=api_submission.yml" target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-indigo-700 transition hover:bg-indigo-50">Suggest an API ↗</a>
        </div>
      </section>
    </>
  );
}
