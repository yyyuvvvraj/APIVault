import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { getPrisma } from "../../src/lib/db";
import { authenticateApiKey, hashApiKey } from "../../src/lib/api-keys";

const prisma = getPrisma();
const userId = randomUUID();
const secret = `av_live_${randomBytes(32).toString("base64url")}`;
let apiKeyId = "";

after(async () => {
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

test("API keys authenticate by hash and update last-used metadata", async () => {
  await prisma.user.create({
    data: { id: userId, name: "API key integration test", email: `${userId}@example.test`, emailVerified: true },
  });
  const key = await prisma.apiKey.create({
    data: {
      userId,
      name: "integration-test",
      keyPrefix: secret.slice(0, 16),
      keyHash: hashApiKey(secret),
      scopes: ["catalogue:read"],
    },
  });
  apiKeyId = key.id;

  const authenticated = await authenticateApiKey(secret);
  assert.deepEqual(authenticated, { id: key.id });
  const saved = await prisma.apiKey.findUniqueOrThrow({ where: { id: key.id } });
  assert.ok(saved.lastUsedAt);
  await prisma.apiKey.update({ where: { id: key.id }, data: { scopes: [] } });
  assert.equal(await authenticateApiKey(secret), null);
});

test("revoked and expired API keys are rejected", async () => {
  await prisma.apiKey.update({ where: { id: apiKeyId }, data: { revokedAt: new Date() } });
  assert.equal(await authenticateApiKey(secret), null);

  const expiredSecret = `av_live_${randomBytes(32).toString("base64url")}`;
  await prisma.apiKey.create({
    data: {
      userId,
      name: "expired-integration-test",
      keyPrefix: expiredSecret.slice(0, 16),
      keyHash: hashApiKey(expiredSecret),
      expiresAt: new Date(Date.now() - 60_000),
    },
  });
  assert.equal(await authenticateApiKey(expiredSecret), null);
});
