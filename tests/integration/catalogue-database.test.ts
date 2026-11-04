import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import {
  ApiStatus,
  AuthMethod,
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
const archivedSlug = `${prefix}-archived-api`;
const unverifiedSlug = `${prefix}-unverified-api`;
const incompleteSlug = `${prefix}-incomplete-api`;

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
      documentationUrl: "https://integration.example.test/docs",
      pricingModel: "UNKNOWN",
      status: ApiStatus.ACTIVE,
      verificationStatus: VerificationStatus.VERIFIED,
      publishedAt: new Date(),
      categories: { create: [{ category: { connect: { id: category.id } } }] },
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

  await prisma.api.createMany({
    data: [
      {
        slug: archivedSlug,
        name: `Archived Integration API ${suffix}`,
        summary: "Archived records must remain private.",
        providerId: provider.id,
        homepageUrl: "https://archived.example.test",
        documentationUrl: "https://archived.example.test/docs",
        status: ApiStatus.ARCHIVED,
        verificationStatus: VerificationStatus.VERIFIED,
        publishedAt: new Date(),
      },
      {
        slug: unverifiedSlug,
        name: `Unverified Integration API ${suffix}`,
        summary: "Unverified records must remain private.",
        providerId: provider.id,
        homepageUrl: "https://unverified.example.test",
        documentationUrl: "https://unverified.example.test/docs",
        status: ApiStatus.ACTIVE,
        verificationStatus: VerificationStatus.UNVERIFIED,
        publishedAt: new Date(),
      },
      {
        slug: incompleteSlug,
        name: `Incomplete Integration API ${suffix}`,
        summary: "Verified records without required evidence must remain private.",
        providerId: provider.id,
        homepageUrl: "https://incomplete.example.test",
        status: ApiStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED,
        publishedAt: new Date(),
      },
    ],
  });

  const filters = parseCatalogueFilters({
    q: "Public Integration",
    category: categorySlug,
    pricing: "UNKNOWN",
    auth: "API_KEY",
  });
  const result = await listApis(filters);
  const visibleSlugs = result.items.map((item) => item.slug);
  assert.equal(visibleSlugs.includes(publicSlug), true);
  for (const hiddenSlug of [pendingSlug, archivedSlug, unverifiedSlug, incompleteSlug]) {
    assert.equal(visibleSlugs.includes(hiddenSlug), false, `${hiddenSlug} must not be public`);
  }

  const publicDetail = await getApiBySlug(publicSlug);
  const pendingDetail = await getApiBySlug(pendingSlug);
  const archivedDetail = await getApiBySlug(archivedSlug);
  const unverifiedDetail = await getApiBySlug(unverifiedSlug);
  const incompleteDetail = await getApiBySlug(incompleteSlug);
  assert.equal(publicDetail.api?.slug, publicSlug);
  assert.equal(pendingDetail.api, null);
  assert.equal(archivedDetail.api, null);
  assert.equal(unverifiedDetail.api, null);
  assert.equal(incompleteDetail.api, null);

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

after(async () => {
  await prisma.$disconnect();
});
