import { getPrisma } from "@/lib/db";
import { AdminCategoryManager } from "@/components/admin-category-manager";

export const metadata = { title: "Category management" };

export default async function AdminCategoriesPage() {
  const categories = await getPrisma().category.findMany({
    include: {
      _count: { select: { apis: true, children: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <header className="mb-7">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-rose-400">Workspace / Taxonomy</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Categories</h1>
        <p className="mt-2 text-sm text-slate-400">Create and maintain the taxonomy used to organise public API listings.</p>
      </header>
      <AdminCategoryManager categories={categories.map((category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        apiCount: category._count.apis,
        childCount: category._count.children,
      }))}/>
    </>
  );
}
