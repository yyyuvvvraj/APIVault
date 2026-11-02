import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed APIVault.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const categories = [
  ["ai-machine-learning", "AI & Machine Learning", "Models, inference, embeddings, and AI services."],
  ["developer-tools", "Developer Tools", "Build, test, deploy, and monitor software."],
  ["data-analytics", "Data & Analytics", "Data access, analytics, and business intelligence."],
  ["finance", "Finance", "Financial data, payments, banking, and markets."],
  ["communication", "Communication", "Email, messaging, voice, and collaboration."],
  ["maps-geospatial", "Maps & Geospatial", "Maps, geocoding, routing, and location data."],
  ["productivity", "Productivity", "Workflows, documents, scheduling, and automation."],
  ["media", "Media", "Images, video, audio, and content services."],
  ["weather-environment", "Weather & Environment", "Weather, climate, and environmental data."],
  ["science-education", "Science & Education", "Research, learning, and scientific datasets."],
] as const;

async function main() {
  for (const [slug, name, description] of categories) {
    await prisma.category.upsert({
      where: { slug },
      update: { name, description },
      create: { slug, name, description },
    });
  }
  console.info(`Seeded ${categories.length} APIVault categories.`);
}

main()
  .catch((error: unknown) => {
    console.error("APIVault seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
