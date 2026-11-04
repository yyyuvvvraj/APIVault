import {
  ApiStatus,
  AuthMethod,
  PricingModel,
  VerificationStatus,
} from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { rankCatalogueResults, tokenizeCatalogueQuery } from "@/lib/catalogue/search";
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

function publicVisibilityWhere(): Prisma.ApiWhereInput {
  return {
    status: ApiStatus.ACTIVE,
    verificationStatus: VerificationStatus.VERIFIED,
    publishedAt: { not: null },
    documentationUrl: { not: null },
    categories: { some: {} },
    authMethods: { some: {} },
    sources: { some: { isOfficial: true, url: { startsWith: "https://" } } },
  };
}

function buildWhere(filters: CatalogueFilters): Prisma.ApiWhereInput {
  const tokens = tokenizeCatalogueQuery(filters.q);

  return {
    ...publicVisibilityWhere(),
    ...(tokens.length
      ? {
          AND: tokens.map((token) => ({
            OR: [
              { name: { contains: token, mode: "insensitive" as const } },
              { slug: { contains: token, mode: "insensitive" as const } },
              { summary: { contains: token, mode: "insensitive" as const } },
              { description: { contains: token, mode: "insensitive" as const } },
              { provider: { is: { name: { contains: token, mode: "insensitive" as const } } } },
              { provider: { is: { slug: { contains: token, mode: "insensitive" as const } } } },
              { tags: { some: { tag: { name: { contains: token, mode: "insensitive" as const } } } } },
              { tags: { some: { tag: { slug: { contains: token, mode: "insensitive" as const } } } } },
              { categories: { some: { category: { name: { contains: token, mode: "insensitive" as const } } } } },
              { categories: { some: { category: { slug: { contains: token, mode: "insensitive" as const } } } } },
            ],
          })),
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

  const shouldRankSearch = filters.sort === "relevance" && filters.q.length > 0;
  const [records, total] = await Promise.all([
    prisma.api.findMany({
      where,
      include: apiCardInclude,
      orderBy,
      ...(shouldRankSearch ? {} : { skip: (filters.page - 1) * filters.limit, take: filters.limit }),
    }),
    prisma.api.count({ where }),
  ]);

  const rankedRecords = shouldRankSearch ? rankCatalogueResults(records, filters.q) : records;
  const items = shouldRankSearch
    ? rankedRecords.slice((filters.page - 1) * filters.limit, filters.page * filters.limit)
    : rankedRecords;

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
      ...publicVisibilityWhere(),
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
