import { generateApiKeySecret } from "@/lib/api-keys";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { hasSameOrigin } from "@/lib/security/origin";
import { consumeRateLimit, hashClientIp, rateLimitHeaders } from "@/lib/api-rate-limit";

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  expiresInDays: z.union([z.literal(30), z.literal(90), z.literal(365)]).nullable().optional(),
});

async function currentUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const keys = await getPrisma().apiKey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, keyPrefix: true, scopes: true, expiresAt: true, lastUsedAt: true, revokedAt: true, createdAt: true },
  });
  return NextResponse.json({ data: keys }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  const rate = await consumeRateLimit(hashClientIp(`api-key-create:${user.id}`), { limit: 5, windowSeconds: 3600 });
  if (!rate.allowed) return NextResponse.json({ error: "rate_limit_exceeded" }, { status: 429, headers: { ...rateLimitHeaders(rate), "Retry-After": String(rate.retryAfterSeconds) } });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });

  const prisma = getPrisma();
  const existingCount = await prisma.apiKey.count({ where: { userId: user.id, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } });
  if (existingCount >= 10) return NextResponse.json({ error: "key_limit_reached", message: "Revoke an unused key before creating another. Maximum: 10 active keys." }, { status: 409 });

  const generated = generateApiKeySecret();
  const expiresAt = parsed.data.expiresInDays ? new Date(Date.now() + parsed.data.expiresInDays * 86_400_000) : null;
  const created = await prisma.apiKey.create({
    data: { userId: user.id, name: parsed.data.name, keyPrefix: generated.prefix, keyHash: generated.hash, scopes: ["catalogue:read"], expiresAt },
    select: { id: true, name: true, keyPrefix: true, scopes: true, expiresAt: true, createdAt: true },
  });
  return NextResponse.json({ data: created, secret: generated.secret }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
