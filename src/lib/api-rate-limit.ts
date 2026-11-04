import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-keys";

export const PUBLIC_API_RATE_LIMIT = 120;
export const PUBLIC_API_RATE_WINDOW_SECONDS = 60;

type RateLimitRow = { count: number };

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

export function getClientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = headers.get("x-forwarded-for")?.split(",").map((value) => value.trim()).filter(Boolean);
  return forwarded?.[0] ?? "unknown";
}

export function hashClientIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}


export async function consumeRateLimit(
  key: string,
  options: { limit?: number; windowSeconds?: number; now?: Date } = {},
): Promise<RateLimitDecision> {
  const limit = options.limit ?? PUBLIC_API_RATE_LIMIT;
  const windowSeconds = options.windowSeconds ?? PUBLIC_API_RATE_WINDOW_SECONDS;
  const now = options.now ?? new Date();
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const resetAt = Math.ceil((windowStart.getTime() + windowMs) / 1000);
  const expiresAt = new Date(windowStart.getTime() + windowMs * 2);
  const prisma = getPrisma();

  const rows = await prisma.$queryRawUnsafe<RateLimitRow[]>(
    'INSERT INTO "ApiRateLimitBucket" ("key", "windowStart", "count", "expiresAt") VALUES ($1, $2, 1, $3) ON CONFLICT ("key", "windowStart") DO UPDATE SET "count" = "ApiRateLimitBucket"."count" + 1 WHERE "ApiRateLimitBucket"."count" < $4 RETURNING "count"',
    key,
    windowStart,
    expiresAt,
    limit,
  );

  if (Math.random() < 0.01) {
    void prisma.$executeRawUnsafe('DELETE FROM "ApiRateLimitBucket" WHERE "expiresAt" < $1', now).catch(() => undefined);
  }

  const allowed = rows.length === 1;
  const count = rows[0]?.count ?? limit;
  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt,
    retryAfterSeconds: Math.max(1, resetAt - Math.floor(now.getTime() / 1000)),
  };
}

export function rateLimitHeaders(decision: RateLimitDecision): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(decision.limit),
    "X-RateLimit-Remaining": String(decision.remaining),
    "X-RateLimit-Reset": String(decision.resetAt),
  };
}


export async function enforcePublicApiRateLimit(
  request: Request,
): Promise<{ headers: Record<string, string>; response: NextResponse | null }> {
  const ipDecision = await consumeRateLimit(hashClientIp(getClientIp(request.headers)));
  const suppliedKey = request.headers.get("x-api-key")?.trim() || request.headers.get("authorization")?.match(/^Bearer\s+(av_live_\S+)$/i)?.[1];
  const apiKey = suppliedKey ? await authenticateApiKey(suppliedKey) : null;
  const invalidKey = Boolean(suppliedKey && !apiKey);
  if (invalidKey) {
    return {
      headers: rateLimitHeaders(ipDecision),
      response: NextResponse.json(
        { error: "invalid_api_key", message: "The supplied APIVault API key is invalid, expired, or revoked." },
        { status: 401, headers: { "Cache-Control": "no-store", "WWW-Authenticate": "Bearer" } },
      ),
    };
  }

  let decision = ipDecision;
  if (apiKey) {
    const keyDecision = await consumeRateLimit(hashClientIp(`api-key:${apiKey.id}`));
    if (!keyDecision.allowed || keyDecision.remaining < ipDecision.remaining) decision = keyDecision;
    if (!keyDecision.allowed) {
      const headers = rateLimitHeaders(keyDecision);
      return {
        headers,
        response: NextResponse.json(
          { error: "rate_limit_exceeded", message: "This API key has exceeded its request limit. Please wait before retrying." },
          { status: 429, headers: { ...headers, "Retry-After": String(keyDecision.retryAfterSeconds) } },
        ),
      };
    }
  }

  const headers = rateLimitHeaders(decision);
  if (!ipDecision.allowed) {
    return {
      headers,
      response: NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests from this client. Please wait before retrying." },
        { status: 429, headers: { ...headers, "Retry-After": String(ipDecision.retryAfterSeconds) } },
      ),
    };
  }
  return { headers, response: null };
}
