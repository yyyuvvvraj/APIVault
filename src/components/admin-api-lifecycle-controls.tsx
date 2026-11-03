"use client";

import { useActionState } from "react";
import { updateApiLifecycleAction } from "@/app/admin/(console)/apis/lifecycle-actions";

type Props = {
  apiId: string;
  status: "ACTIVE" | "DEPRECATED" | "UNAVAILABLE" | "ARCHIVED";
  verificationStatus: "UNVERIFIED" | "PENDING_REVIEW" | "VERIFIED" | "STALE";
  publishedAt: string | null;
};

const initialState = { status: "idle" as const, message: "" };

export function AdminApiLifecycleControls({ apiId, status, verificationStatus, publishedAt }: Props) {
  const [state, formAction, pending] = useActionState(updateApiLifecycleAction, initialState);

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#10151e] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-white">Verification and publication</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Only ACTIVE + VERIFIED records appear in public catalogue queries.</p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide ${publishedAt ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>{publishedAt ? "Published" : "Not published"}</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-black/20 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Availability</p><p className="mt-1 text-sm font-bold text-slate-200">{status}</p></div>
        <div className="rounded-xl bg-black/20 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Verification</p><p className="mt-1 text-sm font-bold text-slate-200">{verificationStatus.replaceAll("_", " ")}</p></div>
      </div>

      {state.message && <p role={state.status === "error" ? "alert" : "status"} className={`mt-4 rounded-xl border px-4 py-3 text-sm ${state.status === "error" ? "border-rose-400/20 bg-rose-400/10 text-rose-200" : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"}`}>{state.message}</p>}

      <form action={formAction} className="mt-5 space-y-4">
        <input type="hidden" name="apiId" value={apiId}/>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-300">Availability status
            <select name="status" defaultValue={status} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1018] px-3 py-3 text-sm text-white">
              <option value="ACTIVE">Active</option>
              <option value="DEPRECATED">Deprecated</option>
              <option value="UNAVAILABLE">Unavailable</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-300">Verification status
            <select name="verificationStatus" defaultValue={verificationStatus} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1018] px-3 py-3 text-sm text-white">
              <option value="UNVERIFIED">Unverified</option>
              <option value="PENDING_REVIEW">Pending review</option>
              <option value="VERIFIED">Verified</option>
              <option value="STALE">Stale</option>
            </select>
          </label>
        </div>
        <label className="block text-xs font-semibold text-slate-300">Review note
          <textarea name="note" maxLength={500} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1018] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/60" placeholder="Required for verification: describe the official evidence checked."/>
        </label>
        <div className="flex justify-end">
          <button type="submit" disabled={pending} className="rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-5 py-3 text-xs font-extrabold text-white disabled:opacity-50">{pending ? "Saving status…" : "Save verification status"}</button>
        </div>
      </form>
    </section>
  );
}
