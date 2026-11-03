import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma CLI migrations need a direct, non-pooled PostgreSQL connection.
    // Fall back to DATABASE_URL for existing local development setups.
    url: process.env.DIRECT_URL ?? env("DATABASE_URL"),
  },
});
