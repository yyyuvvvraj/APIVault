"use client";

import { useActionState } from "react";
import { approveSubmissionAction, type ApprovalState } from "@/app/admin/(console)/submissions/approval-actions";

const initialState: ApprovalState = { status: "idle", message: "" };

export function AdminSubmissionApprovalButton({
  submissionId,
  currentStatus,
}: {
  submissionId: string;
  currentStatus: "PENDING" | "IN_REVIEW" | "CHANGES_REQUESTED" | "REJECTED" | "APPROVED";
}) {
  const [state, action, pending] = useActionState(approveSubmissionAction, initialState);
  const allowed = currentStatus === "IN_REVIEW";

  if (!allowed) return null;

  return (
    <form action={action} className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-4">
      <input type="hidden" name="submissionId" value={submissionId}/>
      <label className="block text-xs font-semibold text-slate-300">Approval note (optional)
        <input name="reviewerNote" maxLength={4000} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0b1018] px-3 py-2.5 text-sm text-white" placeholder="Reason or evidence summary"/>
      </label>
      {state.message && <p role={state.status === "error" ? "alert" : "status"} className={`mt-3 text-xs ${state.status === "error" ? "text-rose-300" : "text-emerald-300"}`}>{state.message}</p>}
      <div className="mt-3 flex justify-end"><button disabled={pending} className="rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 disabled:opacity-50">{pending ? "Applying submission…" : "Approve and apply to catalogue"}</button></div>
      <p className="mt-2 text-[11px] leading-5 text-slate-500">The approved data is applied transactionally. Newly created and materially updated APIs remain pending verification.</p>
    </form>
  );
}
