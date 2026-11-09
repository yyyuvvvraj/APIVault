import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { getPrisma } from "@/lib/db";
import { isAuthRateLimitEnabled } from "@/lib/auth-rate-limit";

const secret = process.env.BETTER_AUTH_SECRET;

if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
  throw new Error("BETTER_AUTH_SECRET must be set to a high-entropy value of at least 32 characters.");
}

export const auth = betterAuth({
  appName: "APIVault",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret,
  database: prismaAdapter(getPrisma(), {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  // The isolated Playwright database uses repeated sign-ins from one runner IP;
  // keep production rate limiting enabled while avoiding test-only throttling.
  rateLimit: { enabled: isAuthRateLimitEnabled() },
  plugins: [admin()],
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
});
