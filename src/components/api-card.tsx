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
    <article className="group relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-950/5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-base font-black text-indigo-700">
          {api.name.slice(0, 1).toUpperCase()}
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Verified</span>
      </div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{api.provider.name}</p>
      <h2 className="text-lg font-extrabold tracking-tight text-slate-950">
        <Link href={`/apis/${api.slug}`} className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-indigo-500">
          {api.name}
        </Link>
      </h2>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">{api.summary}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {api.categories.slice(0, 2).map(({ category }) => (
          <span key={category.slug} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{category.name}</span>
        ))}
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{pricingLabels[api.pricingModel] ?? "Pricing unknown"}</span>
      </div>
    </article>
  );
}
