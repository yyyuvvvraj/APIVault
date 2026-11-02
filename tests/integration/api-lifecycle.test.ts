import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import {
  ApiStatus, AuthMethod, PricingModel, SourceKind, VerificationStatus,
} from "../../src/generated/prisma/client";
import { getPrisma } from "../../src/lib/db";
import { updateApiLifecycle } from "../../src/lib/catalogue/lifecycle-service";
import { getApiBySlug } from "../../src/lib/catalogue/queries";

const prisma = getPrisma();
const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
const prefix = `lifecycle-${suffix}`;
const providerSlug = `${prefix}-provider`;
const categorySlug = `${prefix}-category`;
const slugs = [`${prefix}-valid`, `${prefix}-no-source`, `${prefix}-no-category`, `${prefix}-no-auth`];

async function createFixture(slug: string, options: { source?: boolean; category?: boolean; auth?: boolean } = {}) {
  const provider = await prisma.apiProvider.upsert({
    where: { slug: providerSlug },
    update: {},
    create: { slug: providerSlug, name: `Lifecycle Provider ${suffix}` },
  });
  const category = await prisma.category.upsert({
    where: { slug: categorySlug },
    update: {},
    create: { slug: categorySlug, name: `Lifecycle Category ${suffix}` },
  });
  const homepageUrl = `https://${slug}.example.test`;
  return prisma.api.create({
    data: {
      slug, name: slug, summary: "Fixture for API lifecycle verification and publication tests.",
      providerId: provider.id, homepageUrl, pricingModel: PricingModel.FREEMIUM,
      status: ApiStatus.ACTIVE, verificationStatus: VerificationStatus.PENDING_REVIEW,
      ...(options.category === false ? {} : { categories: { create: [{ categoryId: category.id }] } }),
      ...(options.auth === false ? {} : { authMethods: { create: [{ method: AuthMethod.API_KEY }] } }),
      ...(options.source === false ? {} : { sources: { create: [{
        sourceKind: SourceKind.OFFICIAL_HOMEPAGE, url: homepageUrl, isOfficial: true,
      }] } }),
    },
  });
}

after(async () => {
  await prisma.api.deleteMany({ where: { slug: { in: slugs } } });
  await prisma.apiProvider.deleteMany({ where: { slug: providerSlug } });
  await prisma.category.deleteMany({ where: { slug: categorySlug } });
  await prisma.$disconnect();
});

test("verification requires matching official homepage evidence", async () => {
  const api = await createFixture(slugs[1]!, { source: false });
  await assert.rejects(
    prisma.$transaction((tx) => updateApiLifecycle(tx, api.id, VerificationStatus.VERIFIED, ApiStatus.ACTIVE, "")),
    /official homepage source matching/,
  );
  const saved = await prisma.api.findUniqueOrThrow({ where: { id: api.id } });
  assert.equal(saved.verificationStatus, VerificationStatus.PENDING_REVIEW);
  assert.equal(saved.publishedAt, null);
});

test("verification requires category and authentication classifications", async () => {
  const noCategory = await createFixture(slugs[2]!, { category: false });
  await assert.rejects(
    prisma.$transaction((tx) => updateApiLifecycle(tx, noCategory.id, VerificationStatus.VERIFIED, ApiStatus.ACTIVE, "")),
    /at least one category/,
  );
  const noAuth = await createFixture(slugs[3]!, { auth: false });
  await assert.rejects(
    prisma.$transaction((tx) => updateApiLifecycle(tx, noAuth.id, VerificationStatus.VERIFIED, ApiStatus.ACTIVE, "")),
    /authentication classification/,
  );
});

test("successful verification publishes API and writes an immutable revision", async () => {
  const api = await createFixture(slugs[0]!);
  await prisma.$transaction((tx) => updateApiLifecycle(tx, api.id, VerificationStatus.VERIFIED, ApiStatus.ACTIVE, "Evidence reviewed"));

  const saved = await prisma.api.findUniqueOrThrow({ where: { id: api.id }, include: { revisions: true } });
  assert.equal(saved.verificationStatus, VerificationStatus.VERIFIED);
  assert.ok(saved.verifiedAt);
  assert.ok(saved.lastCheckedAt);
  assert.ok(saved.publishedAt);
  assert.equal(saved.revisions.length, 1);
  assert.equal((await getApiBySlug(api.slug)).api?.slug, api.slug);

  await prisma.$transaction((tx) => updateApiLifecycle(tx, api.id, VerificationStatus.STALE, ApiStatus.ACTIVE, "Evidence is stale"));
  const hidden = await prisma.api.findUniqueOrThrow({ where: { id: api.id } });
  assert.equal(hidden.publishedAt, null);
  assert.equal((await getApiBySlug(api.slug)).api, null);
});
