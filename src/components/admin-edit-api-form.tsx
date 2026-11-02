"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateApiAction } from "@/app/admin/(console)/apis/edit-actions";

type CategoryOption = { slug: string; name: string };
type ApiEditValues = {
  id: string;
  slug: string;
  name: string;
  providerName: string;
  summary: string;
  description: string | null;
  homepageUrl: string;
  documentationUrl: string | null;
  baseUrl: string | null;
  pricingModel: string;
  pricingSummary: string | null;
  categorySlugs: string[];
  authMethods: string[];
};

const authOptions = [
  ["API_KEY", "API key"],
  ["OAUTH2", "OAuth 2.0"],
  ["BEARER_TOKEN", "Bearer token"],
  ["BASIC_AUTH", "Basic authentication"],
  ["NONE", "No authentication"],
  ["CUSTOM", "Custom"],
  ["UNKNOWN", "Unknown"],
] as const;
const pricingOptions = [
  ["UNKNOWN", "Unknown"],
  ["FREE", "Free"],
  ["FREEMIUM", "Freemium"],
  ["PAID", "Paid"],
  ["OPEN_SOURCE", "Open source"],
] as const;
const initialState = { status: "idle" as const, message: "" };

function fieldClass(error: boolean) {
  return `mt-2 w-full rounded-xl border bg-[#0b1018] px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400/60 ${error ? "border-rose-400/50" : "border-white/10"}`;
}
function FieldError({ messages }: { messages?: string[] }) {
  return messages?.length ? <p className="mt-1 text-xs text-rose-300">{messages[0]}</p> : null;
}

export function AdminEditApiForm({ api, categories }: { api: ApiEditValues; categories: CategoryOption[] }) {
  const [state, formAction, pending] = useActionState(updateApiAction, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="apiId" value={api.id} />
      <input type="hidden" name="slug" value={api.slug} />
      {state.message && <div role={state.status === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${state.status === "success" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-rose-400/20 bg-rose-400/10 text-rose-200"}`}>{state.message}</div>}

      <section className="grid gap-5 rounded-2xl border border-white/[0.08] bg-[#10151e] p-5 sm:grid-cols-2">
        <div className="sm:col-span-2"><h2 className="text-sm font-extrabold text-white">API information</h2><p className="mt-1 text-xs text-slate-500">The public slug remains stable when the API name changes.</p></div>
        <label className="text-xs font-semibold text-slate-300">API name<input name="name" defaultValue={api.name} required minLength={2} maxLength={180} className={fieldClass(!!errors.name)} /><FieldError messages={errors.name}/></label>
        <label className="text-xs font-semibold text-slate-300">Provider name<input name="providerName" defaultValue={api.providerName} required minLength={2} maxLength={160} className={fieldClass(!!errors.providerName)} /><FieldError messages={errors.providerName}/></label>
        <label className="text-xs font-semibold text-slate-300 sm:col-span-2">Summary<input name="summary" defaultValue={api.summary} required minLength={10} maxLength={280} className={fieldClass(!!errors.summary)} /><FieldError messages={errors.summary}/></label>
        <label className="text-xs font-semibold text-slate-300 sm:col-span-2">Description<textarea name="description" defaultValue={api.description ?? ""} rows={4} maxLength={4000} className={fieldClass(!!errors.description)}/><FieldError messages={errors.description}/></label>
      </section>

      <section className="grid gap-5 rounded-2xl border border-white/[0.08] bg-[#10151e] p-5 sm:grid-cols-2">
        <div className="sm:col-span-2"><h2 className="text-sm font-extrabold text-white">Official links</h2><p className="mt-1 text-xs text-slate-500">New evidence links are added to the source history; existing evidence is retained.</p></div>
        <label className="text-xs font-semibold text-slate-300 sm:col-span-2">Homepage<input name="homepageUrl" type="url" defaultValue={api.homepageUrl} required className={fieldClass(!!errors.homepageUrl)}/><FieldError messages={errors.homepageUrl}/></label>
        <label className="text-xs font-semibold text-slate-300">Documentation<input name="documentationUrl" type="url" defaultValue={api.documentationUrl ?? ""} className={fieldClass(!!errors.documentationUrl)}/><FieldError messages={errors.documentationUrl}/></label>
        <label className="text-xs font-semibold text-slate-300">API base URL<input name="baseUrl" type="url" defaultValue={api.baseUrl ?? ""} className={fieldClass(!!errors.baseUrl)}/><FieldError messages={errors.baseUrl}/></label>
      </section>

      <section className="grid gap-5 rounded-2xl border border-white/[0.08] bg-[#10151e] p-5 sm:grid-cols-2">
        <div className="sm:col-span-2"><h2 className="text-sm font-extrabold text-white">Classification</h2><p className="mt-1 text-xs text-slate-500">Only select details supported by the evidence.</p></div>
        <fieldset className="sm:col-span-2"><legend className="text-xs font-semibold text-slate-300">Categories</legend><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{categories.map((category) => <label key={category.slug} className="flex items-center gap-2 rounded-lg border border-white/[0.07] px-3 py-2.5 text-xs text-slate-300"><input type="checkbox" name="categorySlugs" value={category.slug} defaultChecked={api.categorySlugs.includes(category.slug)} className="accent-rose-500"/>{category.name}</label>)}</div><FieldError messages={errors.categorySlugs}/></fieldset>
        <fieldset className="sm:col-span-2"><legend className="text-xs font-semibold text-slate-300">Authentication methods</legend><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{authOptions.map(([value,label])=><label key={value} className="flex items-center gap-2 rounded-lg border border-white/[0.07] px-3 py-2.5 text-xs text-slate-300"><input type="checkbox" name="authMethods" value={value} defaultChecked={api.authMethods.includes(value)} className="accent-rose-500"/>{label}</label>)}</div><FieldError messages={errors.authMethods}/></fieldset>
        <label className="text-xs font-semibold text-slate-300">Pricing model<select name="pricingModel" defaultValue={api.pricingModel} className={fieldClass(!!errors.pricingModel)}>{pricingOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><FieldError messages={errors.pricingModel}/></label>
        <label className="text-xs font-semibold text-slate-300">Pricing notes<input name="pricingSummary" defaultValue={api.pricingSummary ?? ""} maxLength={2000} className={fieldClass(!!errors.pricingSummary)}/><FieldError messages={errors.pricingSummary}/></label>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/admin/apis" className="rounded-xl border border-white/10 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-white/5">Cancel</Link><button type="submit" disabled={pending || state.status === "success"} className="rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-5 py-3 text-xs font-extrabold text-white disabled:opacity-50">{pending ? "Saving changes…" : "Save API changes"}</button></div>
      <p className="text-xs leading-5 text-slate-500">Editing does not change verification or publication status. Every successful save creates an audit revision.</p>
    </form>
  );
}
