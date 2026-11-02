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
  return prisma.category.create({ data: { slug: categorySlug, name: `Approval Category ${suffix}` } });
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
  await prisma.api.deleteMany({ where: { slug: apiSlug } });
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
  const api = await prisma.api.findUnique({ where: { slug: apiSlug } });

  assert.equal(savedSubmission.status, SubmissionStatus.IN_REVIEW);
  assert.equal(provider, null);
  assert.equal(api, null);
});
