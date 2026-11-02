import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { AdminCreateApiForm } from "@/components/admin-create-api-form";

export const metadata = { title: "Add API" };

export default async function AdminNewApiPage() {
  const categories = await getPrisma().category.findMany({
    select: { slug: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <header className="mb-7">
        <Link href="/admin/apis" className="text-xs font-semibold text-slate-500 transition hover:text-white">← Back to API catalogue</Link>
        <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.22em] text-rose-400">Workspace / Catalogue / New entry</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Add an API</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Create a catalogue record with source evidence. The entry will remain hidden from public discovery until it has been verified.</p>
      </header>

      {categories.length ? (
        <AdminCreateApiForm categories={categories} />
      ) : (
        <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6">
          <h2 className="text-sm font-bold text-amber-200">No categories are available yet.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Seed the default taxonomy before creating API records:</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-black/30 p-3 text-xs text-slate-300">npm run db:seed</pre>
        </section>
      )}
    </>
  );
}
