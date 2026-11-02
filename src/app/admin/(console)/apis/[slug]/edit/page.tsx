import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { AdminEditApiForm } from "@/components/admin-edit-api-form";

export const metadata = { title: "Edit API" };

type PageProps = { params: Promise<{ slug: string }> };

export default async function AdminEditApiPage({ params }: PageProps) {
  const { slug } = await params;
  const [api, categories] = await Promise.all([
    getPrisma().api.findUnique({
      where: { slug },
      include: {
        provider: { select: { name: true } },
        categories: { include: { category: { select: { slug: true } } } },
        authMethods: { select: { method: true } },
      },
    }),
    getPrisma().category.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  if (!api) notFound();

  return (
    <>
      <header className="mb-7">
        <Link href="/admin/apis" className="text-xs font-semibold text-slate-500 hover:text-white">← Back to API catalogue</Link>
        <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.22em] text-rose-400">Workspace / Catalogue / Edit</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Edit {api.name}</h1>
        <p className="mt-2 text-sm text-slate-400">/{api.slug} · {api.verificationStatus.replaceAll("_", " ")}</p>
      </header>
      <AdminEditApiForm
        categories={categories}
        api={{
          id: api.id,
          slug: api.slug,
          name: api.name,
          providerName: api.provider.name,
          summary: api.summary,
          description: api.description,
          homepageUrl: api.homepageUrl,
          documentationUrl: api.documentationUrl,
          baseUrl: api.baseUrl,
          pricingModel: api.pricingModel,
          pricingSummary: api.pricingSummary,
          categorySlugs: api.categories.map((item) => item.category.slug),
          authMethods: api.authMethods.map((item) => item.method),
        }}
      />
    </>
  );
}
