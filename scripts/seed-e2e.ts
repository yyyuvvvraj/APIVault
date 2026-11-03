import { randomUUID } from "node:crypto";
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

  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  if (!email || !password) throw new Error("E2E_USER_EMAIL and E2E_USER_PASSWORD are required.");

  // Create a real Better Auth credential account with the ordinary user role.
  const context = await auth.$context;
  const hashedPassword = await context.password.hash(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name: "APIVault E2E Standard User", role: null, banned: false },
    create: {
      id: randomUUID(),
      name: "APIVault E2E Standard User",
      email,
      emailVerified: true,
      role: null,
    },
  });
  const credentialAccount = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
    select: { id: true },
  });
  if (credentialAccount) {
    await prisma.account.update({
      where: { id: credentialAccount.id },
      data: { accountId: user.id, password: hashedPassword },
    });
  } else {
    await prisma.account.create({
      data: {
        id: randomUUID(),
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
