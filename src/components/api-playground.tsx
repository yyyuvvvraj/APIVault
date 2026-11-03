"use client";

import { useState } from "react";

type Endpoint = "apis" | "api" | "categories";

type PlaygroundResult = {
  status: number;
  durationMs: number;
  headers: Array<[string, string]>;
  body: string;
};

const inputClass =
  "w-full rounded-lg border border-white/10 bg-[#0b0d11] px-3 py-2.5 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-rose-400/50";

export function ApiPlayground() {
  const [endpoint, setEndpoint] = useState<Endpoint>("apis");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [pricing, setPricing] = useState("");
  const [auth, setAuth] = useState("");
  const [sort, setSort] = useState("relevance");
  const [page, setPage] = useState("1");
  const [limit, setLimit] = useState("20");
  const [slug, setSlug] = useState("nasa-open-apis");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlaygroundResult | null>(null);
  const [requestError, setRequestError] = useState("");

  async function sendRequest() {
    setLoading(true);
    setRequestError("");
    setResult(null);

    const params = new URLSearchParams();
    let path = "/api/v1";

    if (endpoint === "apis") {
      path += "/apis";
      if (query.trim()) params.set("q", query.trim());
      if (category.trim()) params.set("category", category.trim());
      if (pricing) params.set("pricing", pricing);
      if (auth) params.set("auth", auth);
      if (sort !== "relevance") params.set("sort", sort);
      if (page !== "1") params.set("page", page);
      if (limit !== "20") params.set("limit", limit);
    } else if (endpoint === "api") {
      path += `/apis/${encodeURIComponent(slug.trim())}`;
    } else {
      path += "/categories";
    }

    const url = params.size ? `${path}?${params.toString()}` : path;
    const startedAt = performance.now();

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const body = await response.text();
      const durationMs = Math.round(performance.now() - startedAt);
      const headers = [
        "content-type",
        "etag",
        "cache-control",
        "x-ratelimit-limit",
        "x-ratelimit-remaining",
        "x-ratelimit-reset",
        "retry-after",
        "x-request-id",
      ]
        .map((name) => [name, response.headers.get(name)] as const)
        .filter((entry): entry is readonly [string, string] => entry[1] !== null);

      setResult({
        status: response.status,
        durationMs,
        headers: headers.map(([name, value]) => [name, value]),
        body: body ? formatJson(body) : "(empty response body)",
      });
    } catch {
      setRequestError("The request could not be completed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#12151b]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-rose-400">Try it live</p>
          <h2 className="mt-1 text-base font-extrabold text-white">API playground</h2>
        </div>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1 text-[10px] font-bold text-emerald-300">Read-only · No key required</span>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-4">
          <div>
            <label htmlFor="playground-endpoint" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Endpoint</label>
            <select id="playground-endpoint" value={endpoint} onChange={(event) => setEndpoint(event.target.value as Endpoint)} className={inputClass}>
              <option value="apis">GET /api/v1/apis — List APIs</option>
              <option value="api">GET /api/v1/apis/{slug} — API detail</option>
              <option value="categories">GET /api/v1/categories — Categories</option>
            </select>
          </div>

          {endpoint === "apis" ? (
            <>
              <div>
                <label htmlFor="playground-query" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Search query</label>
                <input id="playground-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="weather, maps, finance..." className={inputClass} maxLength={100} />
              </div>
              <div>
                <label htmlFor="playground-category" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Category slug</label>
                <input id="playground-category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="weather-environment" className={inputClass} maxLength={100} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="playground-pricing" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Pricing</label>
                  <select id="playground-pricing" value={pricing} onChange={(event) => setPricing(event.target.value)} className={inputClass}>
                    <option value="">Any</option>
                    <option value="FREE">Free</option>
                    <option value="FREEMIUM">Freemium</option>
                    <option value="PAID">Paid</option>
                    <option value="OPEN_SOURCE">Open source</option>
                    <option value="UNKNOWN">Unknown</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="playground-auth" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Authentication</label>
                  <select id="playground-auth" value={auth} onChange={(event) => setAuth(event.target.value)} className={inputClass}>
                    <option value="">Any</option>
                    <option value="API_KEY">API key</option>
                    <option value="OAUTH2">OAuth 2.0</option>
                    <option value="BEARER_TOKEN">Bearer token</option>
                    <option value="BASIC_AUTH">Basic auth</option>
                    <option value="NONE">None</option>
                    <option value="CUSTOM">Custom</option>
                    <option value="UNKNOWN">Unknown</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="playground-sort" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Sort</label>
                  <select id="playground-sort" value={sort} onChange={(event) => setSort(event.target.value)} className={inputClass}>
                    <option value="relevance">Featured</option>
                    <option value="recent">Recently updated</option>
                    <option value="verified">Recently verified</option>
                    <option value="newest">Newest added</option>
                    <option value="name">Name</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="playground-page" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Page</label>
                  <input id="playground-page" type="number" min="1" max="10000" value={page} onChange={(event) => setPage(event.target.value)} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="playground-limit" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Limit</label>
                  <input id="playground-limit" type="number" min="1" max="50" value={limit} onChange={(event) => setLimit(event.target.value)} className={inputClass} />
                </div>
              </div>
            </>
          ) : endpoint === "api" ? (
            <div>
              <label htmlFor="playground-slug" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">API slug</label>
              <input id="playground-slug" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="nasa-open-apis" className={inputClass} maxLength={160} />
            </div>
          ) : (
            <p className="rounded-lg border border-white/[0.07] bg-black/20 p-3 text-xs leading-5 text-slate-400">Returns the current category directory. No parameters are required.</p>
          )}

          <button type="button" onClick={sendRequest} disabled={loading || (endpoint === "api" && !slug.trim())} className="w-full rounded-lg bg-rose-600 px-4 py-3 text-xs font-extrabold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? "Sending request..." : "Send request →"}
          </button>
          <p className="text-[10px] leading-5 text-slate-600">Requests are sent to this APIVault host. The playground only calls public GET endpoints and does not submit or modify catalogue data.</p>
        </div>

        <div className="min-w-0 overflow-hidden rounded-xl border border-white/[0.07] bg-[#090b0f]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] px-4 py-3">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-500">Response</span>
            {result ? (
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <span className={result.status >= 200 && result.status < 300 ? "text-emerald-300" : "text-rose-300"}>{result.status}</span>
                <span className="text-slate-600">{result.durationMs} ms</span>
              </div>
            ) : <span className="text-[10px] text-slate-600">Awaiting request</span>}
          </div>
          {requestError ? <p role="alert" className="p-4 text-xs text-rose-300">{requestError}</p> : result ? (
            <>
              <div className="border-b border-white/[0.06] px-4 py-3">
                <p className="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-slate-600">Response headers</p>
                <dl className="grid gap-1.5 sm:grid-cols-2">
                  {result.headers.map(([name, value]) => <div key={name} className="min-w-0"><dt className="text-[9px] text-slate-600">{name}</dt><dd className="break-all text-[10px] text-slate-400">{value}</dd></div>)}
                </dl>
              </div>
              <pre className="max-h-[480px] overflow-auto p-4 text-[11px] leading-5 text-emerald-100/80"><code>{result.body}</code></pre>
            </>
          ) : (
            <div className="flex min-h-[300px] items-center justify-center p-6 text-center">
              <div><span className="text-2xl text-slate-700">{"{ }"}</span><p className="mt-3 text-xs text-slate-500">Choose an endpoint and send a request to inspect its response.</p></div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function formatJson(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}
