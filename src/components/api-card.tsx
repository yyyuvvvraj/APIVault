import Link from "next/link";
import type { ApiCardRecord } from "@/lib/catalogue/queries";

const pricingLabels: Record<string, string> = {
  FREE: "Free",
  FREEMIUM: "Freemium",
  PAID: "Paid",
  OPEN_SOURCE: "Open source",
  UNKNOWN: "Pricing unknown",
};

const tileThemes = [
  "from-red-950 via-[#251014] to-[#111111]",
  "from-slate-900 via-[#17212b] to-[#111111]",
  "from-violet-950 via-[#21172b] to-[#111111]",
  "from-emerald-950 via-[#12251f] to-[#111111]",
  "from-amber-950 via-[#2b2113] to-[#111111]",
  "from-cyan-950 via-[#12232a] to-[#111111]",
];

export function ApiCard({ api }: { api: ApiCardRecord }) {
  const theme = tileThemes[api.name.length % tileThemes.length];
  return (
    <article className="av-api-card group relative flex h-full min-h-[255px] flex-col overflow-hidden rounded-md border border-white/10 bg-[#181818] transition duration-300 hover:-translate-y-1 hover:border-white/30 hover:shadow-2xl">
      <div className={`relative flex min-h-[132px] items-end overflow-hidden bg-gradient-to-br ${theme} p-5`}>
        <div className="absolute -right-5 -top-10 h-40 w-40 rounded-full border-[24px] border-white/[0.035] transition duration-500 group-hover:scale-110 group-hover:border-white/[0.07]" />
        <div className="absolute right-5 top-4 flex h-11 w-11 items-center justify-center rounded-md border border-white/15 bg-black/25 text-lg font-black text-white/90 backdrop-blur">{api.name.slice(0, 1).toUpperCase()}</div>
        <div className="relative z-10">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">{api.provider.name}</p>
          <h2 className="max-w-[90%] text-xl font-black tracking-tight text-white">{api.name}</h2>
        </div>
        <span className="absolute bottom-4 right-4 rounded-sm bg-[#e50914] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white">Verified</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-2 min-h-10 text-xs leading-5 text-neutral-400">{api.summary}</p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
          {api.categories.slice(0, 2).map(({ category }) => <span key={category.slug} className="rounded-sm bg-white/[0.07] px-2 py-1 text-[10px] font-semibold text-neutral-300">{category.name}</span>)}
          <span className="rounded-sm border border-white/10 px-2 py-1 text-[10px] font-semibold text-neutral-400">{pricingLabels[api.pricingModel] ?? "Pricing unknown"}</span>
        </div>
      </div>
      <Link href={`/apis/${api.slug}`} aria-label={`View ${api.name}`} className="absolute inset-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e50914]" />
    </article>
  );
}
