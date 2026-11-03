import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { getPrisma } from "../../src/lib/db";
import { consumeRateLimit, hashClientIp } from "../../src/lib/api-rate-limit";

const prisma = getPrisma();
const key = hashClientIp("integration-" + randomUUID());

after(async () => {
  await prisma.$executeRawUnsafe('DELETE FROM "ApiRateLimitBucket" WHERE "key" = $1', key);
  await prisma.$disconnect();
});

test("PostgreSQL rate limit is atomic under concurrent requests and resets in a new window", async () => {
  const now = new Date("2026-11-03T12:00:10.000Z");
  const attempts = await Promise.all(
    Array.from({ length: 12 }, () => consumeRateLimit(key, { limit: 5, windowSeconds: 60, now })),
  );
  assert.equal(attempts.filter((attempt) => attempt.allowed).length, 5);
  assert.equal(attempts.filter((attempt) => !attempt.allowed).length, 7);
  assert.equal(attempts.filter((attempt) => attempt.remaining === 0).length, 12);

  const nextWindow = await consumeRateLimit(key, {
    limit: 5,
    windowSeconds: 60,
    now: new Date("2026-11-03T12:01:00.000Z"),
  });
  assert.equal(nextWindow.allowed, true);
  assert.equal(nextWindow.remaining, 4);
});
