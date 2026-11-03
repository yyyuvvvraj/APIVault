import { randomBytes, createHash } from "node:crypto";
import { getPrisma } from "@/lib/db";

export function hashApiKey(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function generateApiKeySecret(): { secret: string; prefix: string; hash: string } {
  const secret = `av_live_${randomBytes(32).toString("base64url")}`;
  return { secret, prefix: secret.slice(0, 16), hash: hashApiKey(secret) };
}

export async function authenticateApiKey(secret: string) {
  const prisma = getPrisma();
  const record = await prisma.apiKey.findUnique({
    where: { keyHash: hashApiKey(secret) },
    select: {
      id: true,
      scopes: true,
      user: { select: { banned: true } },
      expiresAt: true,
      revokedAt: true,
    },
  });
  if (!record || record.revokedAt || record.user.banned || !record.scopes.includes("catalogue:read") || (record.expiresAt && record.expiresAt <= new Date())) return null;

  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  await prisma.apiKey.updateMany({
    where: { id: record.id, OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: cutoff } }] },
    data: { lastUsedAt: new Date() },
  });
  return { id: record.id };
}
