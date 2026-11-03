import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Neon CLI provides DATABASE_URL_UNPOOLED for direct Prisma migrations.
    // DIRECT_URL remains supported for the hosted Render environment.
    // Local setups without either value can continue using DATABASE_URL.
    url:
      process.env.DATABASE_URL_UNPOOLED ??
      process.env.DIRECT_URL ??
      env("DATABASE_URL"),
  },
});
