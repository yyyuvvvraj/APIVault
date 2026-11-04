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
const archivedSlug = `${prefix}-archived-api`;
const unverifiedSlug = `${prefix}-unverified-api`;
const incompleteSlug = `${prefix}-incomplete-api`;
const wrongEvidenceSlug = `${prefix}-wrong-evidence-api`;

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

  async function createVisibilityFixture(
    slug: string,
    status: ApiStatus,
    verificationStatus: VerificationStatus,
    complete = true,
    officialHomepage = true,
  ) {
    const homepageUrl = `https://${slug}.example.test`;
    return prisma.api.create({
      data: {
        slug,
        name: `Public Integration ${slug}`,
        summary: "Visibility fixture for combined public catalogue filters.",
        providerId: provider.id,
        homepageUrl,
        ...(complete ? { documentationUrl: `${homepageUrl}/docs` } : {}),
        pricingModel: PricingModel.UNKNOWN,
        status,
        verificationStatus,
        publishedAt: new Date(),
        categories: { create: [{ category: { connect: { id: category.id } } }] },
        authMethods: { create: [{ method: AuthMethod.API_KEY }] },
        sources: {
          create: [{
            sourceKind: officialHomepage ? SourceKind.OFFICIAL_HOMEPAGE : SourceKind.DOCUMENTATION,
            url: officialHomepage ? homepageUrl : `${homepageUrl}/docs`,
            isOfficial: true,
          }],
        },
      },
    });
  }

  await Promise.all([
    createVisibilityFixture(pendingSlug, ApiStatus.ACTIVE, VerificationStatus.PENDING_REVIEW),
    createVisibilityFixture(archivedSlug, ApiStatus.ARCHIVED, VerificationStatus.VERIFIED),
    createVisibilityFixture(unverifiedSlug, ApiStatus.ACTIVE, VerificationStatus.UNVERIFIED),
    createVisibilityFixture(incompleteSlug, ApiStatus.ACTIVE, VerificationStatus.VERIFIED, false),
    createVisibilityFixture(wrongEvidenceSlug, ApiStatus.ACTIVE, VerificationStatus.VERIFIED, true, false),
  ]);

  const filters = parseCatalogueFilters({
    q: "Public Provider",
    category: categorySlug,
    pricing: "UNKNOWN",
    auth: "API_KEY",
  });
  const result = await listApis(filters);
  const visibleSlugs = result.items.map((item) => item.slug);
  assert.equal(visibleSlugs.includes(publicSlug), true);
  for (const hiddenSlug of [pendingSlug, archivedSlug, unverifiedSlug, incompleteSlug, wrongEvidenceSlug]) {
    assert.equal(visibleSlugs.includes(hiddenSlug), false, `${hiddenSlug} must not be public`);
  }

  const publicDetail = await getApiBySlug(publicSlug);
  const pendingDetail = await getApiBySlug(pendingSlug);
  const archivedDetail = await getApiBySlug(archivedSlug);
  const unverifiedDetail = await getApiBySlug(unverifiedSlug);
  const incompleteDetail = await getApiBySlug(incompleteSlug);
  const wrongEvidenceDetail = await getApiBySlug(wrongEvidenceSlug);
  assert.equal(publicDetail.api?.slug, publicSlug);
  assert.equal(pendingDetail.api, null);
  assert.equal(archivedDetail.api, null);
  assert.equal(unverifiedDetail.api, null);
  assert.equal(incompleteDetail.api, null);
  assert.equal(wrongEvidenceDetail.api, null);

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
