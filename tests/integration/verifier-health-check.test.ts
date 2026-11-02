import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { ApiStatus, PricingModel, VerificationStatus } from "../../src/generated/prisma/client";
import { getPrisma } from "../../src/lib/db";

const prisma = getPrisma();
const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
const providerSlug = `health-${suffix}-provider`;
const apiSlug = `health-${suffix}-api`;
let apiId = "";

after(async () => {
  if (apiId) await prisma.api.deleteMany({ where: { id: apiId } });
  await prisma.apiProvider.deleteMany({ where: { slug: providerSlug } });
  await prisma.$disconnect();
});

test("persists health observations without changing verification or publication", async () => {
  const provider = await prisma.apiProvider.create({
    data: { slug: providerSlug, name: `Health Provider ${suffix}` },
  });
  const api = await prisma.api.create({
    data: {
      slug: apiSlug,
      name: `Health API ${suffix}`,
      summary: "A fixture for verifier health observation persistence.",
      providerId: provider.id,
      homepageUrl: "https://health.example.test",
      pricingModel: PricingModel.UNKNOWN,
      status: ApiStatus.ACTIVE,
      verificationStatus: VerificationStatus.PENDING_REVIEW,
    },
  });
  apiId = api.id;

  const observation = await prisma.apiHealthCheck.create({
    data: {
      apiId,
      isReachable: true,
      statusCode: 200,
      latencyMs: 137,
      errorMessage: null,
    },
  });

  const saved = await prisma.api.findUniqueOrThrow({
    where: { id: apiId },
    include: { healthChecks: true },
  });
  assert.equal(saved.healthChecks.length, 1);
  assert.equal(saved.healthChecks[0]?.id, observation.id);
  assert.equal(saved.healthChecks[0]?.latencyMs, 137);
  assert.equal(saved.verificationStatus, VerificationStatus.PENDING_REVIEW);
  assert.equal(saved.publishedAt, null);

  await prisma.api.delete({ where: { id: apiId } });
  apiId = "";
  assert.equal(await prisma.apiHealthCheck.findUnique({ where: { id: observation.id } }), null);
});
