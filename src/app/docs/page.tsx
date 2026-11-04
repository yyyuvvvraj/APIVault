import type { Metadata } from "next";
import Link from "next/link";
import { ApiPlayground } from "@/components/api-playground";

export const metadata: Metadata = {
  title: "API Documentation",
  description: "Explore the APIVault read-only REST API and try live requests.",
};

const endpoints = [
  { method: "GET", path: "/api/v1/apis", description: "List verified APIs with search, filtering, sorting, and pagination." },
  { method: "GET", path: "/api/v1/apis/{slug}", description: "Retrieve a verified API and its source-backed metadata." },
  { method: "GET", path: "/api/v1/categories", description: "List the categories currently used by the catalogue." },
];

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-[#0b0c0f] px-5 py-12 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-rose-400">For developers</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-white">APIVault API</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">A read-only REST API for discovering active, verified API listings. Explore the endpoints, inspect the OpenAPI contract, and try requests without leaving the page.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/openapi.json" target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/5">OpenAPI JSON ↗</a>
            <Link href="/apis" className="rounded-lg border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/5">Browse catalogue →</Link>
          </div>
        </div>

        <section className="mb-10">
          <h2 className="mb-4 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">Available endpoints</h2>
          <div className="overflow-hidden rounded-xl border border-white/[0.08]">
            {endpoints.map((endpoint) => (
              <div key={endpoint.path} className="grid gap-2 border-b border-white/[0.06] px-4 py-4 last:border-b-0 sm:grid-cols-[70px_minmax(0,1fr)] sm:items-center">
                <span className="w-fit rounded-md border border-emerald-400/20 bg-emerald-400/5 px-2 py-1 text-[10px] font-extrabold text-emerald-300">{endpoint.method}</span>
                <div><code className="text-xs font-bold text-white">{endpoint.path}</code><p className="mt-1 text-xs text-slate-500">{endpoint.description}</p></div>
              </div>
            ))}
          </div>
        </section>

        <ApiPlayground />

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/[0.08] bg-[#12151b] p-5">
            <h2 className="text-sm font-extrabold text-white">Rate limits</h2>
            <p className="mt-2 text-xs leading-6 text-slate-400">Unauthenticated public requests are limited to 120 requests per client IP per 60-second window. Responses include rate-limit headers; HTTP 429 responses include a Retry-After value. Respect caching headers and use conditional requests with ETags where possible.</p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[#12151b] p-5">
            <h2 className="text-sm font-extrabold text-white">Publication policy</h2>
            <p className="mt-2 text-xs leading-6 text-slate-400">Only active and verified catalogue entries are returned. APIVault endpoints are read-only; API submissions and catalogue changes go through the separate moderated contribution workflow.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
