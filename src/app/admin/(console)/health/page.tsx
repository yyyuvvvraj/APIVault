import Link from "next/link";
import { ApiStatus } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";

export const metadata = { title: "Verifier health" };

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

function dateTime(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#10151e] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-white">{value.toLocaleString("en-IN")}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

export default async function AdminHealthPage() {
  const db = getPrisma();
  const [{ now }] = await db.$queryRaw<Array<{ now: Date }>>`SELECT CURRENT_TIMESTAMP AS now`;
  const apis = await db.api.findMany({
    where: { status: { not: ApiStatus.ARCHIVED } },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      verificationStatus: true,
      homepageUrl: true,
      provider: { select: { name: true } },
      healthChecks: {
        orderBy: { checkedAt: "desc" },
        take: 5,
        select: {
          id: true,
          checkedAt: true,
          isReachable: true,
          statusCode: true,
          latencyMs: true,
          errorMessage: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const nowMs = now.getTime();
  const unreachable = apis.filter((api) => api.healthChecks[0]?.isReachable === false);
  const stale = apis.filter((api) => {
    const latest = api.healthChecks[0];
    return !latest || nowMs - latest.checkedAt.getTime() > STALE_AFTER_MS;
  });
  const failedRecent = apis.filter((api) => api.healthChecks.some((check) => !check.isReachable));

  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-rose-400">Workspace / Operations</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Verifier health</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Recent homepage checks, stale observations, and verifier failures. Health signals are operational only and never publish or unverify an API automatically.
          </p>
        </div>
        <Link href="/admin/apis" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/[0.08]">Manage catalogue ↗</Link>
      </header>

      <section aria-label="Verifier summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="APIs monitored" value={apis.length} detail="Non-archived catalogue records" />
        <Metric label="Unreachable latest check" value={unreachable.length} detail="Most recent observation failed" />
        <Metric label="Stale / never checked" value={stale.length} detail="No check in the last 24 hours" />
        <Metric label="Recent failures" value={failedRecent.length} detail="At least one failure in latest 5 checks" />
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#10151e]">
        <div className="border-b border-white/[0.07] px-5 py-4">
          <h2 className="text-sm font-extrabold text-white">API health history</h2>
          <p className="mt-1 text-xs text-slate-500">Latest five observations per API · Stale threshold: 24 hours</p>
        </div>
        {apis.length ? (
          <div className="divide-y divide-white/[0.06]">
            {apis.map((api) => {
              const latest = api.healthChecks[0];
              const isStale = !latest || now - latest.checkedAt.getTime() > STALE_AFTER_MS;
              const hasRecentFailure = api.healthChecks.some((check) => !check.isReachable);
              return (
                <article key={api.id} className="px-5 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/admin/apis/${api.slug}/review`} className="text-sm font-bold text-white hover:text-rose-300">{api.name}</Link>
                      <p className="mt-1 text-xs text-slate-500">{api.provider.name} · {api.slug}</p>
                      <p className="mt-1 truncate text-xs text-slate-600">{api.homepageUrl}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{api.status}</span>
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{api.verificationStatus.replaceAll("_", " ")}</span>
                      {isStale && <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-300">Stale observation</span>}
                      {latest?.isReachable === false && <span className="rounded-full bg-rose-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-300">Unreachable</span>}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Latest observation</p>
                      {latest ? (
                        <>
                          <p className={`mt-2 text-sm font-bold ${latest.isReachable ? "text-emerald-300" : "text-rose-300"}`}>
                            {latest.isReachable ? "Reachable" : "Unreachable"} · {latest.statusCode ?? "No HTTP status"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{dateTime(latest.checkedAt)} · {latest.latencyMs} ms</p>
                          {latest.errorMessage && <p className="mt-2 break-words text-xs text-rose-300/90">{latest.errorMessage}</p>}
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-amber-300">No health observations recorded yet.</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recent history</p>
                      {api.healthChecks.length ? (
                        <ul className="mt-2 space-y-2">
                          {api.healthChecks.map((check) => (
                            <li key={check.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className={check.isReachable ? "text-emerald-300" : "text-rose-300"}>{check.isReachable ? "● Reachable" : "● Failed"} · {check.statusCode ?? "—"} · {check.latencyMs} ms</span>
                              <span className="text-slate-500">{dateTime(check.checkedAt)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">Waiting for the first verifier run.</p>
                      )}
                      {hasRecentFailure && <p className="mt-3 text-[11px] font-semibold text-rose-300">One or more of the latest five checks failed. Review the error details above.</p>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-slate-400">No catalogue APIs are available for monitoring.</p>
        )}
      </section>
      <p className="mt-4 text-xs leading-6 text-slate-500">
        Stale means the latest check is older than 24 hours or no check exists. These labels do not alter catalogue status, verification evidence, or public visibility. The worker must be running and configured before new observations appear.
      </p>
    </>
  );
}
