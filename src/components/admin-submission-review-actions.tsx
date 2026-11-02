"use client";

import { useActionState } from "react";
import {
  updateSubmissionReviewAction,
  type SubmissionReviewState,
} from "@/app/admin/(console)/submissions/actions";

const initialState: SubmissionReviewState = { status: "idle", message: "" };

export function AdminSubmissionReviewActions({
  submissionId,
  currentStatus,
}: {
  submissionId: string;
  currentStatus: "PENDING" | "IN_REVIEW" | "CHANGES_REQUESTED" | "REJECTED" | "APPROVED";
}) {
  const [state, action, pending] = useActionState(updateSubmissionReviewAction, initialState);
  const terminal = currentStatus === "REJECTED" || currentStatus === "APPROVED";

  return (
    <section className="mt-4 rounded-xl border border-white/[0.07] bg-black/20 p-4">
      <h3 className="text-xs font-extrabold text-slate-200">Moderation decision</h3>
      {terminal ? (
        <p className="mt-2 text-xs text-slate-500">This submission has a terminal decision. It cannot be changed from this inbox.</p>
      ) : (
        <form action={action} className="mt-3 space-y-3">
          <input type="hidden" name="submissionId" value={submissionId}/>
          <label className="block text-xs font-semibold text-slate-300">Next action
            <select name="nextStatus" defaultValue={currentStatus === "CHANGES_REQUESTED" ? "IN_REVIEW" : "IN_REVIEW"} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0b1018] px-3 py-2.5 text-sm text-white">
              <option value="IN_REVIEW">Move to in review</option>
              <option value="CHANGES_REQUESTED">Request changes</option>
              <option value="REJECTED">Reject submission</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-300">Reviewer note
            <textarea name="reviewNote" rows={3} maxLength={4000} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0b1018] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/60" placeholder="Required for requests for changes and rejection."/>
          </label>
          {state.message && <p role={state.status === "error" ? "alert" : "status"} className={`text-xs ${state.status === "error" ? "text-rose-300" : "text-emerald-300"}`}>{state.message}</p>}
          <div className="flex justify-end"><button disabled={pending} className="rounded-lg border border-white/10 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/5 disabled:opacity-50">{pending ? "Saving…" : "Save review decision"}</button></div>
        </form>
      )}
      {state.message && terminal && <p role="status" className="mt-2 text-xs text-emerald-300">{state.message}</p>}
    </section>
  );
}
