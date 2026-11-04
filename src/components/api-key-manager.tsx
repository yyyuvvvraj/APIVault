"use client";

import { useCallback, useState, type FormEvent } from "react";

type ApiKey = { id: string; name: string; keyPrefix: string; scopes: string[]; expiresAt: string | null; lastUsedAt: string | null; revokedAt: string | null; createdAt: string };
type CreatedKey = { secret: string; data: ApiKey };

export function ApiKeyManager({ initialKeys }: { initialKeys: ApiKey[] }) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [name, setName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("90");
  const [created, setCreated] = useState<CreatedKey | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/account/keys", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Unable to load API keys.");
      setKeys(body.data);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load API keys."); }
    finally { setLoading(false); }
  }, []);


  async function createKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setCreated(null);
    const response = await fetch("/api/account/keys", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, expiresInDays: expiresInDays === "never" ? null : Number(expiresInDays) }),
    });
    const body = await response.json();
    if (!response.ok) { setError(body.message || "Unable to create API key."); return; }
    setCreated(body); setName(""); await refresh();
  }

  async function revoke(id: string) {
    setError("");
    const response = await fetch(`/api/account/keys/${id}`, { method: "DELETE" });
    if (!response.ok) { setError("Unable to revoke this key."); return; }
    await refresh();
  }

  return <div className="space-y-5">
    <form onSubmit={createKey} className="grid gap-3 rounded-2xl border border-white/[0.08] bg-[#14171d] p-5 sm:grid-cols-[1fr_180px_auto] sm:items-end">
      <div><label htmlFor="key-name" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Key name</label><input id="key-name" value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={80} placeholder="My app integration" className="w-full rounded-lg border border-white/10 bg-[#0b0d11] px-3 py-2.5 text-sm text-white outline-none focus:border-rose-400/50" /></div>
      <div><label htmlFor="key-expiry" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Expires</label><select id="key-expiry" value={expiresInDays} onChange={e=>setExpiresInDays(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0b0d11] px-3 py-2.5 text-sm text-white"><option value="30">30 days</option><option value="90">90 days</option><option value="365">1 year</option><option value="never">Never</option></select></div>
      <button className="rounded-lg bg-rose-600 px-5 py-3 text-xs font-extrabold text-white hover:bg-rose-500">Create key</button>
    </form>
    {error && <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-400/5 p-3 text-xs text-rose-200">{error}</p>}
    {created && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4"><p className="text-xs font-bold text-emerald-200">Copy this key now. It will not be shown again.</p><code className="mt-2 block break-all text-xs text-white">{created.secret}</code><button onClick={()=>navigator.clipboard.writeText(created.secret)} className="mt-3 rounded-md border border-white/10 px-3 py-1.5 text-[11px] font-bold text-slate-200">Copy key</button></div>}
    <section className="overflow-hidden rounded-2xl border border-white/[0.08]"><div className="border-b border-white/[0.07] px-5 py-4"><h2 className="text-sm font-extrabold text-white">Your keys</h2><p className="mt-1 text-[10px] text-slate-500">Every key is read-only and receives the catalogue:read scope. Keys do not increase the shared IP rate limit.</p></div>{loading ? <p className="p-5 text-xs text-slate-500">Loading keys…</p> : keys.length ? <div className="divide-y divide-white/[0.06]">{keys.map(key=><div key={key.id} className="flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="text-sm font-bold text-white">{key.name}</p><code className="mt-1 block text-xs text-slate-400">{key.keyPrefix}••••••••</code><p className="mt-1 text-[10px] text-slate-500">Scope: {key.scopes.join(", ") || "No active scope"}</p><p className="mt-1 text-[10px] text-slate-600">Created: {new Date(key.createdAt).toLocaleDateString()} · {key.revokedAt ? "Revoked" : key.expiresAt ? `Expires ${new Date(key.expiresAt).toLocaleDateString()}` : "No expiry"} · Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}</p></div>{!key.revokedAt && <button onClick={()=>void revoke(key.id)} className="rounded-lg border border-rose-400/20 px-3 py-2 text-[10px] font-bold text-rose-300 hover:bg-rose-400/5">Revoke</button>}</div>)}</div> : <p className="p-5 text-xs text-slate-500">No API keys yet.</p>}</section>
  </div>;
}
