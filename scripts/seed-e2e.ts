import { getPrisma } from "../src/lib/db";
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
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
