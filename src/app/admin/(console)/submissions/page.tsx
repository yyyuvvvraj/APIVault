import { getPrisma } from "@/lib/db";

export const metadata = { title: "Community submissions" };

export default async function AdminSubmissionsPage() {
  const submissions = await getPrisma().apiSubmission.findMany({
    include: {
      targetApi: { select: { name: true, slug: true } },
      sources: { select: { id: true, url: true, sourceKind: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
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
                <p className="mt-1 text-xs text-slate-500">
                  {submission.submitterName || "Community member"}
                  {submission.submitterGithub ? " · @" + submission.submitterGithub : ""}
                  {" · "}
                  {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(submission.createdAt)}
                </p>
              </div>
              <span className="rounded-full bg-amber-400/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-300">{submission.status.replaceAll("_", " ")}</span>
            </div>
            {submission.targetApi && <p className="mt-3 text-xs text-slate-400">Target API: {submission.targetApi.name} ({submission.targetApi.slug})</p>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Submitted details</p>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-300">{JSON.stringify(submission.payload, null, 2)}</pre>
              </div>
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Source evidence</p>
                {submission.sources.length ? (
                  <ul className="mt-2 space-y-2">
                    {submission.sources.map((source) => (
                      <li key={source.id} className="break-all text-xs leading-5">
                        <span className="mr-2 text-slate-500">{source.sourceKind.replaceAll("_", " ")}</span>
                        <a href={source.url} target="_blank" rel="noreferrer" className="font-semibold text-cyan-300 hover:underline">{source.url}</a>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-2 text-xs text-slate-500">No source URLs attached.</p>}
              </div>
            </div>
            {submission.reviewNote && <p className="mt-3 text-xs text-slate-400">Review note: {submission.reviewNote}</p>}
          </article>
        ))}
        {!submissions.length && (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
            <p className="text-sm font-bold text-slate-300">Your review queue is clear.</p>
            <p className="mt-2 text-xs text-slate-500">New community submissions will appear here.</p>
          </div>
        )}
      </div>
    </>
  );
}
