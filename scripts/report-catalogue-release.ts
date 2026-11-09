import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { buildCatalogueReleaseReport } from "../src/lib/catalogue/release-report";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to generate the catalogue release report.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

try {
  const records = await prisma.api.findMany({
    select: {
      slug: true,
      name: true,
      status: true,
      verificationStatus: true,
      publishedAt: true,
      provider: { select: { name: true } },
      categories: { select: { category: { select: { name: true } } } },
      sources: {
        where: { isOfficial: true },
        select: { url: true, isOfficial: true },
      },
    },
  });

  const report = buildCatalogueReleaseReport(records);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await prisma.$disconnect();
}
