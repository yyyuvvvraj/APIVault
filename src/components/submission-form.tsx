"use client";

import { useState, type FormEvent } from "react";

const input = "w-full rounded-lg border border-white/10 bg-[#0b0d11] px-3 py-2.5 text-sm text-white outline-none focus:border-rose-400/50";

export function SubmissionForm() {
  const [kind, setKind] = useState("CREATE");
  const [targetApiId, setTargetApiId] = useState("");
  const [form, setForm] = useState({ name: "", providerName: "", summary: "", description: "", homepageUrl: "", documentationUrl: "", baseUrl: "", categorySlugs: "developer-tools", authMethods: "NONE", pricingModel: "UNKNOWN", pricingSummary: "", sourceUrls: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess(""); setBusy(true);
    const api = { ...form, documentationUrl: form.documentationUrl.trim() || undefined, baseUrl: form.baseUrl.trim() || undefined, categorySlugs: form.categorySlugs.split(",").map(v=>v.trim()).filter(Boolean), authMethods: form.authMethods.split(",").map(v=>v.trim()).filter(Boolean), sourceUrls: form.sourceUrls.split("\n").map(v=>v.trim()).filter(Boolean) };
    try {
      const response = await fetch("/api/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, targetApiId: kind === "UPDATE" ? targetApiId : undefined, api }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || body.issues?.[0]?.message || "Submission failed.");
      setSuccess(`Submission received. Reference: ${body.data.id}`);
    } catch (err) { setError(err instanceof Error ? err.message : "Submission failed."); }
    finally { setBusy(false); }
  }

  function field(name: keyof typeof form, label: string, placeholder: string, required = true) {
    return <div><label htmlFor={name} className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</label><input id={name} className={input} value={form[name]} onChange={e=>setForm({...form,[name]:e.target.value})} placeholder={placeholder} required={required} /></div>;
  }

  return <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#14171d] p-5">
    <div><label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Submission type</label><select className={input} value={kind} onChange={e=>setKind(e.target.value)}><option value="CREATE">New API</option><option value="UPDATE">Update existing API</option></select></div>
    {kind === "UPDATE" && <div><label htmlFor="target-api" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Existing API record ID</label><input id="target-api" className={input} value={targetApiId} onChange={e=>setTargetApiId(e.target.value)} required placeholder="API UUID from its catalogue record" /></div>}
    <div className="grid gap-4 sm:grid-cols-2">{field("name","API name","Example API")}{field("providerName","Provider","Example Inc.")}</div>
    {field("summary","Short summary","What does this API provide?")}
    <div><label htmlFor="description" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Description</label><textarea id="description" className={input} rows={3} maxLength={4000} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></div>
    <div className="grid gap-4 sm:grid-cols-2">{field("homepageUrl","Official API homepage","https://example.com")}{field("documentationUrl","Documentation URL","https://docs.example.com",false)}{field("baseUrl","Base URL","https://api.example.com",false)}{field("categorySlugs","Category slugs (comma separated)","developer-tools")}</div>
    <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="auth-methods" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Authentication methods</label><input id="auth-methods" className={input} value={form.authMethods} onChange={e=>setForm({...form,authMethods:e.target.value})} placeholder="API_KEY, NONE" required /></div><div><label htmlFor="pricing-model" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Pricing model</label><select id="pricing-model" className={input} value={form.pricingModel} onChange={e=>setForm({...form,pricingModel:e.target.value})}><option>UNKNOWN</option><option>FREE</option><option>FREEMIUM</option><option>PAID</option><option>OPEN_SOURCE</option></select></div></div>
    <div><label htmlFor="pricing-summary" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Pricing details</label><textarea id="pricing-summary" className={input} rows={2} value={form.pricingSummary} onChange={e=>setForm({...form,pricingSummary:e.target.value})} /></div>
    <div><label htmlFor="source-urls" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Official source URLs (one per line)</label><textarea id="source-urls" className={input} rows={4} value={form.sourceUrls} onChange={e=>setForm({...form,sourceUrls:e.target.value})} placeholder={"https://docs.example.com\nhttps://example.com/pricing"} required /></div>
    <p className="text-[10px] leading-5 text-slate-500">Do not submit API keys, passwords, or other secrets. Keep source URLs public and official. Submissions are limited to 5 per account per hour.</p>
    {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}{success && <p role="status" className="text-xs text-emerald-300">{success} · <a href="/account/submissions" className="underline">View submissions</a></p>}
    <button disabled={busy} className="rounded-lg bg-rose-600 px-5 py-3 text-xs font-extrabold text-white disabled:opacity-50">{busy ? "Submitting…" : "Submit for review"}</button>
  </form>;
}
