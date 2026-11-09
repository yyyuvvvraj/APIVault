import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { findSubmissionDuplicateCandidates, type DuplicateSubmissionInput } from "@/lib/submissions/duplicate-detection";
import { AdminSubmissionReviewActions } from "@/components/admin-submission-review-actions";
import { AdminSubmissionApprovalButton } from "@/components/admin-submission-approval-button";
import { getModerationPriority } from "@/lib/submissions/moderation-priority";

export const metadata = { title: "Community submissions" };

const statusTone: Record<string, string> = {
  PENDING: "bg-amber-400/10 text-amber-300",
  IN_REVIEW: "bg-sky-400/10 text-sky-300",
  CHANGES_REQUESTED: "bg-orange-400/10 text-orange-300",
  REJECTED: "bg-rose-400/10 text-rose-300",
  APPROVED: "bg-emerald-400/10 text-emerald-300",
};

export default async function AdminSubmissionsPage() {
  const prisma = getPrisma();
  const submissions = await prisma.apiSubmission.findMany({
    include: {
      targetApi: { select: { name: true, slug: true } },
      sources: { select: { id: true, url: true, sourceKind: true } },
      reviewEvents: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, previousStatus: true, nextStatus: true, note: true, reviewerUserId: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const duplicateConditions: Prisma.ApiWhereInput[] = submissions.flatMap((submission) => {
    if (submission.kind !== "CREATE" || !submission.payload || typeof submission.payload !== "object" || Array.isArray(submission.payload)) return [];
    const payload = submission.payload as DuplicateSubmissionInput;
    const conditions: Prisma.ApiWhereInput[] = [];
    if (typeof payload.homepageUrl === "string") {
      conditions.push({ homepageUrl: { equals: payload.homepageUrl, mode: "insensitive" } });
      try {
        const host = new URL(payload.homepageUrl).hostname.toLowerCase().replace(/^www\./, "");
        if (host) conditions.push({ homepageUrl: { contains: host, mode: "insensitive" } });
      } catch {
        // Invalid URLs are rejected by submission validation; skip host-based lookup defensively.
      }
    }
    if (typeof payload.name === "string" && typeof payload.providerName === "string") {
      conditions.push({
        name: { equals: payload.name, mode: "insensitive" },
        provider: { is: { name: { equals: payload.providerName, mode: "insensitive" } } },
      });
    }
    return conditions;
  });
  const possibleDuplicates = duplicateConditions.length
    ? await prisma.api.findMany({
        where: { OR: duplicateConditions },
        select: { id: true, slug: true, name: true, homepageUrl: true, provider: { select: { name: true } } },
        take: 500,
      })
    : [];
  const duplicateHints = new Map(submissions.map((submission) => [
    submission.id,
    submission.kind === "CREATE" ? findSubmissionDuplicateCandidates(
      submission.payload && typeof submission.payload === "object" && !Array.isArray(submission.payload)
        ? submission.payload as DuplicateSubmissionInput : {},
      possibleDuplicates,
      submission.targetApiId,
    ) : [],
  ]));

  const priorityBySubmission = new Map(submissions.map((submission) => {
    const duplicateCount = (duplicateHints.get(submission.id) ?? []).length;
    return [submission.id, getModerationPriority({
      status: submission.status,
      kind: submission.kind,
      createdAt: submission.createdAt,
      payload: submission.payload,
      sourceKinds: submission.sources.map((source) => source.sourceKind),
      duplicateCount,
      hasTargetApi: Boolean(submission.targetApi),
    })] as const;
  }));
  submissions.sort((a, b) => {
    const scoreDelta = (priorityBySubmission.get(b.id)?.score ?? 0) - (priorityBySubmission.get(a.id)?.score ?? 0);
    return scoreDelta || a.createdAt.getTime() - b.createdAt.getTime();
  });

  return (
    <>
      <header className="mb-7">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-rose-400">Workspace / Moderation</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Submission inbox</h1>
        <p className="mt-2 text-sm text-slate-400">Review submitted API suggestions and catalogue corrections.</p>
      </header>

      <div className="space-y-3">
        {submissions.map((submission) => (
          <article key={submission.id} className="rounded-2xl border border-white/[0.08] bg-[#10151e] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-white">{submission.kind === "CREATE" ? "New API suggestion" : "Update request"}</p>
                <p className="mt-1 text-xs text-slate-500">{submission.submitterName || "Community member"}{submission.submitterGithub ? " · @" + submission.submitterGithub : ""} · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(submission.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2"><span className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-2.5 py-1.5 text-[10px] font-extrabold text-cyan-200">Priority {priorityBySubmission.get(submission.id)?.score ?? 0}</span><span className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide ${statusTone[submission.status]}`}>{submission.status.replaceAll("_", " ")}</span></div>
            </div>
            {submission.targetApi && <p className="mt-3 text-xs text-slate-400">Target API: {submission.targetApi.name} ({submission.targetApi.slug})</p>}
            {(priorityBySubmission.get(submission.id)?.reasons ?? []).length > 0 && <p className="mt-2 text-xs leading-5 text-amber-300">Triage signals: {priorityBySubmission.get(submission.id)?.reasons.join(" · ")}</p>}
            {(duplicateHints.get(submission.id) ?? []).length > 0 && (
              <section aria-label="Possible duplicate APIs" className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-amber-300">Possible catalogue duplicates — manual review required</p>
                <ul className="mt-2 space-y-1.5">
                  {(duplicateHints.get(submission.id) ?? []).map((candidate) => (
                    <li key={candidate.id} className="text-xs text-slate-300">
                      <a href={`/admin/apis/${candidate.slug}/review`} className="font-bold text-amber-200 hover:underline">{candidate.name}</a>
                      <span className="text-slate-500"> · {candidate.providerName} · {candidate.reason}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] text-slate-500">These are conservative name/provider or homepage matches, not an automatic rejection or proof that records are identical.</p>
              </section>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Submitted details</p>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-300">{JSON.stringify(submission.payload, null, 2)}</pre>
              </div>
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Source evidence</p>
                {submission.sources.length ? (
                  <ul className="mt-2 space-y-2">{submission.sources.map((source) => <li key={source.id} className="break-all text-xs leading-5"><span className="mr-2 text-slate-500">{source.sourceKind.replaceAll("_", " ")}</span><a href={source.url} target="_blank" rel="noreferrer" className="font-semibold text-cyan-300 hover:underline">{source.url}</a></li>)}</ul>
                ) : <p className="mt-2 text-xs text-slate-500">No source URLs attached.</p>}
              </div>
            </div>
            {submission.reviewNote && <p className="mt-3 text-xs text-slate-400">Latest review note: {submission.reviewNote}</p>}
            {submission.reviewEvents.length > 0 && (
              <section className="mt-4 rounded-xl border border-white/[0.07] bg-black/20 p-4" aria-label="Moderation audit history">
                <h3 className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Moderation history</h3>
                <ol className="mt-3 space-y-3">
                  {submission.reviewEvents.map((event) => (
                    <li key={event.id} className="border-l border-cyan-400/30 pl-3">
                      <p className="text-xs font-bold text-slate-200">{event.previousStatus.replaceAll("_", " ")} → {event.nextStatus.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-[10px] text-slate-500">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(event.createdAt)} · Reviewer {event.reviewerUserId}</p>
                      {event.note && <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-400">{event.note}</p>}
                    </li>
                  ))}
                </ol>
              </section>
            )}
            <AdminSubmissionReviewActions submissionId={submission.id} currentStatus={submission.status}/>
            <AdminSubmissionApprovalButton submissionId={submission.id} currentStatus={submission.status}/>
          </article>
        ))}
        {!submissions.length && <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center"><p className="text-sm font-bold text-slate-300">Your review queue is clear.</p><p className="mt-2 text-xs text-slate-500">New community submissions will appear here.</p></div>}
      </div>
    </>
  );
}
