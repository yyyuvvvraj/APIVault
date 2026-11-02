import Link from "next/link";
import type { ApiCardRecord } from "@/lib/catalogue/queries";

const pricingLabels: Record<string, string> = {
  FREE: "Free",
  FREEMIUM: "Freemium",
  PAID: "Paid",
  OPEN_SOURCE: "Open source",
  UNKNOWN: "Pricing unknown",
};

export function ApiCard({ api }: { api: ApiCardRecord }) {
  return (
    <article className="group relative flex h-full flex-col rounded-xl border border-white/[0.08] bg-[#15171b] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-rose-400/30 hover:bg-[#191b20]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-sm font-black text-rose-300 ring-1 ring-white/[0.06]">{api.name.slice(0, 1).toUpperCase()}</div>
        <span className="rounded-md bg-emerald-400/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-300">Verified</span>
      </div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{api.provider.name}</p>
      <h2 className="text-base font-extrabold tracking-tight text-white">
        <Link href={`/apis/${api.slug}`} className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-rose-400">{api.name}</Link>
      </h2>
      <p className="mt-2 line-clamp-3 flex-1 text-xs leading-5 text-slate-400">{api.summary}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {api.categories.slice(0, 2).map(({ category }) => (
          <span key={category.slug} className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] font-semibold text-slate-400">{category.name}</span>
        ))}
        <span className="rounded-md bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-300">{pricingLabels[api.pricingModel] ?? "Pricing unknown"}</span>
      </div>
    </article>
  );
}
