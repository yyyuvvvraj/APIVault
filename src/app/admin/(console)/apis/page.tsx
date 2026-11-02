import Link from "next/link";
import { getPrisma } from "@/lib/db";

export const metadata = { title: "API management" };

const statusTone: Record<string, string> = {
  VERIFIED: "bg-emerald-400/10 text-emerald-300",
  UNVERIFIED: "bg-slate-400/10 text-slate-300",
  PENDING_REVIEW: "bg-amber-400/10 text-amber-300",
  STALE: "bg-orange-400/10 text-orange-300",
};

export default async function AdminApisPage() {
  const apis = await getPrisma().api.findMany({
    include: { provider: { select: { name: true } } },
    orderBy: [{ updatedAt: "desc" }],
    take: 100,
  });

  return (
    <>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-rose-400">Workspace / Catalogue</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white">API catalogue</h1>
          <p className="mt-2 text-sm text-slate-400">All records, including unverified and archived entries.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300">{apis.length} records shown</span>
          <Link href="/admin/apis/new" className="rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-rose-950/30 transition hover:brightness-110">+ Add API</Link>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#10151e]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-white/[0.025] text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
              <tr><th className="px-5 py-4">API / Provider</th><th className="px-5 py-4">Visibility</th><th className="px-5 py-4">Verification</th><th className="px-5 py-4">Last updated</th><th className="px-5 py-4">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {apis.map((api) => (
                <tr key={api.id} className="transition hover:bg-white/[0.025]">
                  <td className="px-5 py-4"><p className="font-bold text-slate-100">{api.name}</p><p className="mt-1 text-xs text-slate-500">{api.provider.name} · /{api.slug}</p></td>
                  <td className="px-5 py-4 text-xs font-semibold text-slate-300">{api.status}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${statusTone[api.verificationStatus] ?? "bg-slate-400/10 text-slate-300"}`}>{api.verificationStatus.replaceAll("_", " ")}</span></td>
                  <td className="px-5 py-4 text-xs text-slate-500">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(api.updatedAt)}</td>
                  <td className="px-5 py-4"><div className="flex items-center gap-3 text-xs font-bold"><Link href={`/admin/apis/${api.slug}/edit`} className="text-cyan-300 hover:text-cyan-200">Edit</Link><Link href={`/admin/apis/${api.slug}/review`} className="text-amber-300 hover:text-amber-200">Review</Link><Link href={`/admin/apis/${api.slug}/history`} className="text-slate-400 hover:text-white">History</Link></div></td>
                </tr>
              ))}
              {!apis.length && <tr><td colSpan={5} className="px-5 py-16 text-center"><p className="text-sm text-slate-400">No API records yet.</p><Link href="/admin/apis/new" className="mt-2 inline-block text-xs font-bold text-rose-400 hover:text-rose-300">Create the first catalogue entry →</Link></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
