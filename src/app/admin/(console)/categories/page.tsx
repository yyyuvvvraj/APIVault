import { getPrisma } from "@/lib/db";

export const metadata = { title: "Category management" };

export default async function AdminCategoriesPage() {
  const categories = await getPrisma().category.findMany({
    include: { _count: { select: { apis: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <header className="mb-7">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-rose-400">Workspace / Taxonomy</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Categories</h1>
        <p className="mt-2 text-sm text-slate-400">Manage the taxonomy used to organise public API listings.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => (
          <article key={category.id} className="rounded-2xl border border-white/[0.08] bg-[#10151e] p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-extrabold text-white">{category.name}</h2>
              <span className="rounded-lg bg-white/[0.05] px-2 py-1 text-xs font-bold tabular-nums text-slate-300">{category._count.apis}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">{category.description || "No description"}</p>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">{category.slug}</p>
          </article>
        ))}
      </div>
    </>
  );
}
