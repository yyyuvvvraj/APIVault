import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import {
  ApiStatus,
  AuthMethod,
  PricingModel,
  SourceKind,
  VerificationStatus,
} from "../../src/generated/prisma/client";
import { getPrisma } from "../../src/lib/db";
import { listApis, getApiBySlug } from "../../src/lib/catalogue/queries";
import { parseCatalogueFilters } from "../../src/lib/catalogue/search";

const prisma = getPrisma();
const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const prefix = `integration-${suffix}`;
const providerSlug = `${prefix}-provider`;
const categorySlug = `${prefix}-category`;
const publicSlug = `${prefix}-public-api`;
const pendingSlug = `${prefix}-pending-api`;

after(async () => {
  await prisma.api.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.apiProvider.deleteMany({ where: { slug: providerSlug } });
  await prisma.category.deleteMany({ where: { slug: categorySlug } });
});

test("persists relational catalogue data and exposes only ACTIVE + VERIFIED APIs", async () => {
  const provider = await prisma.apiProvider.create({
    data: { slug: providerSlug, name: `Integration Provider ${suffix}` },
  });
  const category = await prisma.category.create({
    data: { slug: categorySlug, name: `Integration Category ${suffix}` },
  });

  await prisma.api.create({
    data: {
      slug: publicSlug,
      name: `Public Integration API ${suffix}`,
      summary: "Integration fixture for public catalogue query tests.",
      providerId: provider.id,
      homepageUrl: "https://integration.example.test",
      status: ApiStatus.ACTIVE,
      verificationStatus: VerificationStatus.VERIFIED,
      publishedAt: new Date(),
      categories: { create: [{ categoryId: category.id }] },
      authMethods: { create: [{ method: AuthMethod.API_KEY }] },
      sources: {
        create: [{
          sourceKind: SourceKind.OFFICIAL_HOMEPAGE,
          url: "https://integration.example.test",
          isOfficial: true,
        }],
      },
    },
  });

  await prisma.api.create({
    data: {
      slug: pendingSlug,
      name: `Pending Integration API ${suffix}`,
      summary: "Must remain hidden from public catalogue.",
      providerId: provider.id,
      homepageUrl: "https://pending.example.test",
      status: ApiStatus.ACTIVE,
      verificationStatus: VerificationStatus.PENDING_REVIEW,
    },
  });

  const result = await listApis(parseCatalogueFilters({}));
  const visibleSlugs = result.items.map((item) => item.slug);
  assert.equal(visibleSlugs.includes(publicSlug), true);
  assert.equal(visibleSlugs.includes(pendingSlug), false);

  const publicDetail = await getApiBySlug(publicSlug);
  const pendingDetail = await getApiBySlug(pendingSlug);
  assert.equal(publicDetail.api?.slug, publicSlug);
  assert.equal(pendingDetail.api, null);

  const relations = await prisma.api.findUniqueOrThrow({
    where: { slug: publicSlug },
    include: { categories: true, authMethods: true, sources: true },
  });
  assert.equal(relations.categories.length, 1);
  assert.equal(relations.authMethods[0]?.method, AuthMethod.API_KEY);
  assert.equal(relations.sources[0]?.isOfficial, true);
});

test("rolls back all writes when a multi-record transaction fails", async () => {
  const rollbackProviderSlug = `${prefix}-rollback-provider`;
  const rollbackCategorySlug = `${prefix}-rollback-category`;

  await assert.rejects(
    prisma.$transaction(async (tx) => {
      await tx.apiProvider.create({
        data: { slug: rollbackProviderSlug, name: "Rollback Provider" },
      });
      await tx.category.create({
        data: { slug: rollbackCategorySlug, name: "Rollback Category" },
      });
      throw new Error("intentional integration rollback");
    }),
    /intentional integration rollback/,
  );

  const [provider, category] = await Promise.all([
    prisma.apiProvider.findUnique({ where: { slug: rollbackProviderSlug } }),
    prisma.category.findUnique({ where: { slug: rollbackCategorySlug } }),
  ]);
  assert.equal(provider, null);
  assert.equal(category, null);
});
