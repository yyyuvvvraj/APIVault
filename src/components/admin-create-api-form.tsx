"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createApiAction } from "@/app/admin/(console)/apis/actions";

type CategoryOption = { slug: string; name: string };

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

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1.5 text-xs text-rose-300">{messages[0]}</p>;
}

function fieldClass(hasError: boolean) {
  return `mt-2 w-full rounded-xl border bg-[#0b1018] px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10 ${hasError ? "border-rose-400/50" : "border-white/10"}`;
}

export function AdminCreateApiForm({ categories }: { categories: CategoryOption[] }) {
  const [state, formAction, pending] = useActionState(createApiAction, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <div
          role={state.status === "error" ? "alert" : "status"}
          className={`rounded-xl border px-4 py-3 text-sm ${state.status === "success" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-rose-400/20 bg-rose-400/10 text-rose-200"}`}
        >
          <p>{state.message}</p>
          {state.createdSlug && (
            <p className="mt-2 text-xs">
              Catalogue slug: <code className="font-mono text-emerald-100">{state.createdSlug}</code>
            </p>
          )}
        </div>
      )}

      <section className="grid gap-5 rounded-2xl border border-white/[0.08] bg-[#10151e] p-5 sm:grid-cols-2 sm:p-6">
        <div className="sm:col-span-2">
          <h2 className="text-sm font-extrabold text-white">Basic information</h2>
          <p className="mt-1 text-xs text-slate-500">Describe the API and the organisation that provides it.</p>
        </div>

        <label className="block text-xs font-semibold text-slate-300">
          API name <span className="text-rose-400">*</span>
          <input name="name" required minLength={2} maxLength={180} className={fieldClass(!!errors.name)} placeholder="e.g. OpenAI API" />
          <FieldError messages={errors.name} />
        </label>

        <label className="block text-xs font-semibold text-slate-300">
          Provider name <span className="text-rose-400">*</span>
          <input name="providerName" required minLength={2} maxLength={160} className={fieldClass(!!errors.providerName)} placeholder="e.g. OpenAI" />
          <FieldError messages={errors.providerName} />
        </label>

        <label className="block text-xs font-semibold text-slate-300 sm:col-span-2">
          Short summary <span className="text-rose-400">*</span>
          <input name="summary" required minLength={10} maxLength={280} className={fieldClass(!!errors.summary)} placeholder="A factual one-sentence description (10–280 characters)" />
          <FieldError messages={errors.summary} />
        </label>

        <label className="block text-xs font-semibold text-slate-300 sm:col-span-2">
          Description
          <textarea name="description" rows={4} maxLength={4000} className={fieldClass(!!errors.description)} placeholder="More detail about capabilities, use cases and important limitations." />
          <FieldError messages={errors.description} />
        </label>
      </section>

      <section className="grid gap-5 rounded-2xl border border-white/[0.08] bg-[#10151e] p-5 sm:grid-cols-2 sm:p-6">
        <div className="sm:col-span-2">
          <h2 className="text-sm font-extrabold text-white">Official links</h2>
          <p className="mt-1 text-xs text-slate-500">Provide evidence links. These are recorded in the API's source history.</p>
        </div>

        <label className="block text-xs font-semibold text-slate-300 sm:col-span-2">
          Official homepage <span className="text-rose-400">*</span>
          <input name="homepageUrl" type="url" required className={fieldClass(!!errors.homepageUrl)} placeholder="https://provider.example" />
          <FieldError messages={errors.homepageUrl} />
        </label>

        <label className="block text-xs font-semibold text-slate-300">
          Documentation URL
          <input name="documentationUrl" type="url" className={fieldClass(!!errors.documentationUrl)} placeholder="https://docs.provider.example" />
          <FieldError messages={errors.documentationUrl} />
        </label>

        <label className="block text-xs font-semibold text-slate-300">
          API base URL
          <input name="baseUrl" type="url" className={fieldClass(!!errors.baseUrl)} placeholder="https://api.provider.example/v1" />
          <FieldError messages={errors.baseUrl} />
        </label>
      </section>

      <section className="grid gap-5 rounded-2xl border border-white/[0.08] bg-[#10151e] p-5 sm:grid-cols-2 sm:p-6">
        <div className="sm:col-span-2">
          <h2 className="text-sm font-extrabold text-white">Classification</h2>
          <p className="mt-1 text-xs text-slate-500">Choose the details supported by the sources. Unknown is preferable to guessing.</p>
        </div>

        <fieldset className="sm:col-span-2">
          <legend className="text-xs font-semibold text-slate-300">Categories <span className="text-rose-400">*</span></legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <label key={category.slug} className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-black/10 px-3 py-2.5 text-xs text-slate-300">
                <input type="checkbox" name="categorySlugs" value={category.slug} className="accent-rose-500" />
                {category.name}
              </label>
            ))}
          </div>
          <FieldError messages={errors.categorySlugs} />
        </fieldset>

        <fieldset className="sm:col-span-2">
          <legend className="text-xs font-semibold text-slate-300">Authentication methods <span className="text-rose-400">*</span></legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {authOptions.map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-black/10 px-3 py-2.5 text-xs text-slate-300">
                <input type="checkbox" name="authMethods" value={value} defaultChecked={value === "UNKNOWN"} className="accent-rose-500" />
                {label}
              </label>
            ))}
          </div>
          <FieldError messages={errors.authMethods} />
        </fieldset>

        <label className="block text-xs font-semibold text-slate-300">
          Pricing model
          <select name="pricingModel" defaultValue="UNKNOWN" className={fieldClass(!!errors.pricingModel)}>
            {pricingOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <FieldError messages={errors.pricingModel} />
        </label>

        <label className="block text-xs font-semibold text-slate-300">
          Pricing notes
          <input name="pricingSummary" maxLength={2000} className={fieldClass(!!errors.pricingSummary)} placeholder="Limits, tiers or qualifications, if known" />
          <FieldError messages={errors.pricingSummary} />
        </label>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/apis" className="rounded-xl border border-white/10 px-4 py-3 text-xs font-bold text-slate-300 transition hover:bg-white/5">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending || state.status === "success"}
          className="rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-5 py-3 text-xs font-extrabold text-white shadow-lg shadow-rose-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Creating API…" : state.status === "success" ? "API created" : "Create unverified API"}
        </button>
      </div>
      <p className="text-xs leading-5 text-slate-500">New entries are saved as pending verification and remain hidden from the public catalogue until a maintainer verifies them.</p>
    </form>
  );
}
