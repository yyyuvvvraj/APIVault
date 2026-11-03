import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { SubmissionKind, SubmissionStatus, VerificationStatus } from "../../src/generated/prisma/client";
import { getPrisma } from "../../src/lib/db";
import { applySubmissionApproval } from "../../src/lib/submissions/approval-service";

const prisma = getPrisma();
const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
const categorySlug = `approval-${suffix}`;
const providerName = `Approval Provider ${suffix}`;
const apiSlug = `approval-api-${suffix}`;
const submissionIds: string[] = [];

async function setupCategory() {
  return prisma.category.upsert({
    where: { slug: categorySlug },
    update: {},
    create: { slug: categorySlug, name: `Approval Category ${suffix}` },
  });
}

async function createSubmission(category: string, variant = "") {
  const row = await prisma.apiSubmission.create({
    data: {
      kind: SubmissionKind.CREATE,
      status: SubmissionStatus.IN_REVIEW,
      payload: {
        name: `Approval API ${suffix}${variant}`,
        providerName: `${providerName}${variant}`,
        summary: "Integration test API proposal with sufficient descriptive detail.",
        homepageUrl: `https://${apiSlug}.example.test`,
        documentationUrl: `https://${apiSlug}.example.test/docs`,
        categorySlugs: [category],
        authMethods: ["API_KEY"],
        pricingModel: "FREEMIUM",
        sourceUrls: [`https://${apiSlug}.example.test/pricing`],
        submitterGithub: "integration-test",
      },
    },
  });
  submissionIds.push(row.id);
  return row;
}

after(async () => {
  await prisma.apiSubmission.deleteMany({ where: { id: { in: submissionIds } } });
  await prisma.api.deleteMany({ where: { slug: { startsWith: apiSlug } } });
  await prisma.apiProvider.deleteMany({ where: { name: { startsWith: providerName } } });
  await prisma.category.deleteMany({ where: { slug: categorySlug } });
  await prisma.$disconnect();
});

test("approval atomically creates API, evidence, revision, and approved submission", async () => {
  const category = await setupCategory();
  const submission = await createSubmission(category.slug);

  const slug = await prisma.$transaction((tx) =>
    applySubmissionApproval(tx, submission.id, "Reviewed official sources"),
  );

  assert.equal(slug, `approval-api-${suffix}`);
  const savedSubmission = await prisma.apiSubmission.findUniqueOrThrow({ where: { id: submission.id } });
  const api = await prisma.api.findUniqueOrThrow({
    where: { slug },
    include: { sources: true, categories: true, revisions: true },
  });

  assert.equal(savedSubmission.status, SubmissionStatus.APPROVED);
  assert.equal(savedSubmission.reviewNote, "Reviewed official sources");
  assert.equal(api.verificationStatus, VerificationStatus.PENDING_REVIEW);
  assert.equal(api.publishedAt, null);
  assert.equal(api.categories.length, 1);
  assert.equal(api.sources.some((source) => source.isOfficial && source.url === api.homepageUrl), true);
  assert.equal(api.revisions.length, 1);
  assert.equal(api.revisions[0]?.snapshot !== null, true);
});

test("approval fails and rolls back provider creation when submitted category is missing", async () => {
  const submission = await createSubmission(`missing-${suffix}`, "-rollback");

  await assert.rejects(
    prisma.$transaction((tx) => applySubmissionApproval(tx, submission.id, "")),
    /categories no longer exist/,
  );

  const savedSubmission = await prisma.apiSubmission.findUniqueOrThrow({ where: { id: submission.id } });
  const provider = await prisma.apiProvider.findFirst({ where: { name: `${providerName}-rollback` } });
  const api = await prisma.api.findUnique({ where: { slug: `${apiSlug}-rollback` } });

  assert.equal(savedSubmission.status, SubmissionStatus.IN_REVIEW);
  assert.equal(provider, null);
  assert.equal(api, null);
});


test("UPDATE approval applies payload, records a revision, and returns the API to pending verification", async () => {
  const category = await setupCategory();
  const provider = await prisma.apiProvider.create({
    data: { slug: `update-provider-${suffix}`, name: `${providerName}-update` },
  });
  const originalHomepage = `https://original-${apiSlug}.example.test`;
  const api = await prisma.api.create({
    data: {
      slug: `${apiSlug}-existing`,
      name: `Existing API ${suffix}`,
      summary: "Existing verified API before community update.",
      providerId: provider.id,
      homepageUrl: originalHomepage,
      status: "ACTIVE",
      verificationStatus: VerificationStatus.VERIFIED,
      verifiedAt: new Date(),
      publishedAt: new Date(),
      categories: { create: [{ category: { connect: { id: category.id } } }] },
    },
  });

  const submission = await prisma.apiSubmission.create({
    data: {
      kind: SubmissionKind.UPDATE,
      status: SubmissionStatus.IN_REVIEW,
      targetApiId: api.id,
      payload: {
        name: `Updated API ${suffix}`,
        providerName: provider.name,
        summary: "Updated summary supplied by the community for review.",
        homepageUrl: `https://updated-${apiSlug}.example.test`,
        documentationUrl: `https://updated-${apiSlug}.example.test/docs`,
        categorySlugs: [category.slug],
        authMethods: ["OAUTH2"],
        pricingModel: "PAID",
        sourceUrls: [`https://updated-${apiSlug}.example.test/pricing`],
        submitterGithub: "update-integration-test",
      },
    },
  });
  submissionIds.push(submission.id);

  const returnedSlug = await prisma.$transaction((tx) =>
    applySubmissionApproval(tx, submission.id, "Reviewed UPDATE evidence"),
  );

  const [savedSubmission, updatedApi] = await Promise.all([
    prisma.apiSubmission.findUniqueOrThrow({ where: { id: submission.id } }),
    prisma.api.findUniqueOrThrow({
      where: { id: api.id },
      include: { categories: true, authMethods: true, sources: true, revisions: true },
    }),
  ]);

  assert.equal(returnedSlug, api.slug);
  assert.equal(savedSubmission.status, SubmissionStatus.APPROVED);
  assert.equal(savedSubmission.reviewNote, "Reviewed UPDATE evidence");
  assert.equal(updatedApi.name, `Updated API ${suffix}`);
  assert.equal(updatedApi.summary, "Updated summary supplied by the community for review.");
  assert.equal(updatedApi.homepageUrl, `https://updated-${apiSlug}.example.test`);
  assert.equal(updatedApi.pricingModel, "PAID");
  assert.equal(updatedApi.verificationStatus, VerificationStatus.PENDING_REVIEW);
  assert.equal(updatedApi.verifiedAt, null);
  assert.equal(updatedApi.publishedAt, null);
  assert.equal(updatedApi.categories.length, 1);
  assert.equal(updatedApi.authMethods.length, 1);
  assert.equal(updatedApi.authMethods[0]?.method, "OAUTH2");
  assert.equal(updatedApi.sources.some((source) => source.isOfficial && source.url === updatedApi.homepageUrl), true);
  assert.equal(updatedApi.revisions.length, 1);
  assert.equal(updatedApi.revisions[0]?.action, "UPDATED");
  assert.equal((updatedApi.revisions[0]?.snapshot as { name?: string }).name, `Updated API ${suffix}`);
});
