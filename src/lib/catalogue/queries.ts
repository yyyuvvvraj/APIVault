import {
  ApiStatus,
  AuthMethod,
  PricingModel,
  VerificationStatus,
} from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import type { CatalogueFilters } from "@/lib/catalogue/search";

const apiCardInclude = {
  provider: { select: { name: true, slug: true } },
  categories: { include: { category: { select: { name: true, slug: true } } } },
  tags: { include: { tag: { select: { name: true, slug: true } } } },
  authMethods: { select: { method: true, details: true } },
} satisfies Prisma.ApiInclude;

const apiDetailInclude = {
  provider: { select: { name: true, slug: true, homepageUrl: true } },
  categories: { include: { category: { select: { name: true, slug: true } } } },
  tags: { include: { tag: { select: { name: true, slug: true } } } },
  authMethods: { select: { method: true, details: true } },
  sources: { orderBy: { checkedAt: "desc" as const } },
  rateLimits: { include: { source: true } },
  pricingPlans: { include: { source: true }, orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.ApiInclude;

export type ApiCardRecord = Prisma.ApiGetPayload<{ include: typeof apiCardInclude }>;
export type ApiDetailRecord = Prisma.ApiGetPayload<{ include: typeof apiDetailInclude }>;

function buildWhere(filters: CatalogueFilters): Prisma.ApiWhereInput {
  const query = filters.q;

  return {
    status: ApiStatus.ACTIVE,
    verificationStatus: VerificationStatus.VERIFIED,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { slug: { contains: query, mode: "insensitive" } },
            { summary: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { provider: { is: { name: { contains: query, mode: "insensitive" } } } },
            { provider: { is: { slug: { contains: query, mode: "insensitive" } } } },
            { tags: { some: { tag: { name: { contains: query, mode: "insensitive" } } } } },
            { tags: { some: { tag: { slug: { contains: query, mode: "insensitive" } } } } },
            { categories: { some: { category: { name: { contains: query, mode: "insensitive" } } } } },
          ],
        }
      : {}),
    ...(filters.category
      ? { categories: { some: { category: { slug: filters.category } } } }
      : {}),
    ...(filters.pricing !== "ALL"
      ? { pricingModel: filters.pricing as PricingModel }
      : {}),
    ...(filters.auth !== "ALL"
      ? { authMethods: { some: { method: filters.auth as AuthMethod } } }
      : {}),
  };
}

export async function listApis(filters: CatalogueFilters) {
  if (!process.env.DATABASE_URL) {
    return { databaseStatus: "missing" as const, items: [] as ApiCardRecord[], total: 0, totalPages: 0 };
  }

  const prisma = getPrisma();
  const where = buildWhere(filters);
  const orderBy: Prisma.ApiOrderByWithRelationInput[] =
    filters.sort === "name"
      ? [{ name: "asc" }, { slug: "asc" }]
      : filters.sort === "verified"
        ? [{ verifiedAt: "desc" }, { name: "asc" }]
        : filters.sort === "newest"
          ? [{ createdAt: "desc" }, { name: "asc" }]
          : filters.sort === "recent"
            ? [{ updatedAt: "desc" }, { name: "asc" }]
            : [{ featured: "desc" }, { updatedAt: "desc" }, { name: "asc" }];

  const [items, total] = await Promise.all([
    prisma.api.findMany({
      where,
      include: apiCardInclude,
      orderBy,
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    prisma.api.count({ where }),
  ]);

  return {
    databaseStatus: "ready" as const,
    items,
    total,
    totalPages: Math.ceil(total / filters.limit),
  };
}

export async function getApiBySlug(slug: string) {
  if (!process.env.DATABASE_URL) {
    return { databaseStatus: "missing" as const, api: null };
  }

  const api = await getPrisma().api.findFirst({
    where: {
      slug,
      status: ApiStatus.ACTIVE,
      verificationStatus: VerificationStatus.VERIFIED,
    },
    include: apiDetailInclude,
  });

  return { databaseStatus: "ready" as const, api };
}

export async function listCategories() {
  if (!process.env.DATABASE_URL) {
    return { databaseStatus: "missing" as const, categories: [] as { name: string; slug: string }[] };
  }

  const categories = await getPrisma().category.findMany({
    select: { name: true, slug: true },
    orderBy: { name: "asc" },
  });

  return { databaseStatus: "ready" as const, categories };
}
