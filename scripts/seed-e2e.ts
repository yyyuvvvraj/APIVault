import { getPrisma } from "../src/lib/db";
import { auth } from "../src/lib/auth";
import { SubmissionKind, SubmissionStatus, SourceKind } from "../src/generated/prisma/client";

const prisma = getPrisma();

async function main() {
  const category = await prisma.category.upsert({
    where: { slug: "e2e-testing" },
    update: {},
    create: { slug: "e2e-testing", name: "E2E Testing" },
  });

  await prisma.apiSubmission.create({
    data: {
      kind: SubmissionKind.CREATE,
      status: SubmissionStatus.PENDING,
      submitterName: "E2E Community Member",
      submitterGithub: "e2e-community",
      payload: {
        name: "E2E Moderation Fixture",
        providerName: "E2E Fixture Provider",
        summary: "A fixture proposal used to test the moderation workflow.",
        homepageUrl: "https://e2e-fixture.example.test",
        documentationUrl: "https://e2e-fixture.example.test/docs",
        categorySlugs: [category.slug],
        authMethods: ["API_KEY"],
        pricingModel: "FREEMIUM",
        sourceUrls: ["https://e2e-fixture.example.test/pricing"],
        submitterGithub: "e2e-community",
      },
      sources: {
        create: [{
          sourceKind: SourceKind.OFFICIAL_HOMEPAGE,
          url: "https://e2e-fixture.example.test",
        }],
      },
    },
  });


  await prisma.apiSubmission.create({
    data: {
      kind: SubmissionKind.CREATE,
      status: SubmissionStatus.PENDING,
      submitterName: "E2E Approval Community Member",
      submitterGithub: "e2e-approval-community",
      payload: {
        name: "E2E Approval Lifecycle API",
        providerName: "E2E Approval Lifecycle Provider",
        summary: "A fixture proposal used to test approval and pending verification.",
        homepageUrl: "https://e2e-approval.example.test",
        documentationUrl: "https://e2e-approval.example.test/docs",
        categorySlugs: [category.slug],
        authMethods: ["API_KEY"],
        pricingModel: "FREEMIUM",
        sourceUrls: ["https://e2e-approval.example.test/pricing"],
        submitterGithub: "e2e-approval-community",
      },
      sources: {
        create: [{
          sourceKind: SourceKind.OFFICIAL_HOMEPAGE,
          url: "https://e2e-approval.example.test",
        }],
      },
    },
  });


  await prisma.apiSubmission.create({
    data: {
      kind: SubmissionKind.CREATE,
      status: SubmissionStatus.PENDING,
      submitterName: "E2E Approval Retry Community Member",
      submitterGithub: "e2e-approval-retry-community",
      payload: {
        name: "E2E Approval Lifecycle Retry API",
        providerName: "E2E Approval Lifecycle Retry Provider",
        summary: "A retry-safe fixture proposal used to test approval and pending verification.",
        homepageUrl: "https://e2e-approval-retry.example.test",
        documentationUrl: "https://e2e-approval-retry.example.test/docs",
        categorySlugs: [category.slug],
        authMethods: ["API_KEY"],
        pricingModel: "FREEMIUM",
        sourceUrls: ["https://e2e-approval-retry.example.test/pricing"],
        submitterGithub: "e2e-approval-retry-community",
      },
      sources: {
        create: [{
          sourceKind: SourceKind.OFFICIAL_HOMEPAGE,
          url: "https://e2e-approval-retry.example.test",
        }],
      },
    },
  });

  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  if (!email || !password) throw new Error("E2E_USER_EMAIL and E2E_USER_PASSWORD are required.");

  // Recreate this isolated fixture through Better Auth's own adapter so the
  // credential account is shaped exactly as the installed auth version expects.
  await prisma.user.deleteMany({ where: { email } });
  const context = await auth.$context;
  const user = await context.internalAdapter.createUser(
    {
      name: "APIVault E2E Standard User",
      email,
      emailVerified: true,
      role: "user",
      banned: false,
    },
    { method: "test" },
  );
  const hashedPassword = await context.password.hash(password);
  await context.internalAdapter.createAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: hashedPassword,
  });

  const retryEmail = process.env.E2E_USER_RETRY_EMAIL;
  const retryPassword = process.env.E2E_USER_RETRY_PASSWORD;
  if (!retryEmail || !retryPassword) throw new Error("E2E_USER_RETRY_EMAIL and E2E_USER_RETRY_PASSWORD are required.");

  await prisma.user.deleteMany({ where: { email: retryEmail } });
  const retryUser = await context.internalAdapter.createUser(
    {
      name: "APIVault E2E Retry User",
      email: retryEmail,
      emailVerified: true,
      role: "user",
      banned: false,
    },
    { method: "test" },
  );
  const retryHashedPassword = await context.password.hash(retryPassword);
  await context.internalAdapter.createAccount({
    userId: retryUser.id,
    providerId: "credential",
    accountId: retryUser.id,
    password: retryHashedPassword,
  });

}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
