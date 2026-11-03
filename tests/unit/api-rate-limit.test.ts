import assert from "node:assert/strict";
import test from "node:test";
import { getClientIp, hashClientIp, rateLimitHeaders } from "../../src/lib/api-rate-limit";

test("client IP prefers the reverse proxy's normalized x-real-ip header", () => {
  const headers = new Headers({
    "x-real-ip": "203.0.113.10",
    "x-forwarded-for": "198.51.100.20, 10.0.0.1",
  });
  assert.equal(getClientIp(headers), "203.0.113.10");
});

test("client IP falls back to the first forwarded address and then unknown", () => {
  assert.equal(getClientIp(new Headers({ "x-forwarded-for": "198.51.100.20, 10.0.0.1" })), "198.51.100.20");
  assert.equal(getClientIp(new Headers()), "unknown");
});

test("client identifiers are stable one-way hashes", () => {
  const first = hashClientIp("203.0.113.10");
  assert.equal(first, hashClientIp("203.0.113.10"));
  assert.notEqual(first, "203.0.113.10");
  assert.equal(first.length, 64);
});

test("rate limit response headers expose limit, remaining, and reset", () => {
  assert.deepEqual(
    rateLimitHeaders({ allowed: true, limit: 120, remaining: 119, resetAt: 1800000060, retryAfterSeconds: 60 }),
    { "X-RateLimit-Limit": "120", "X-RateLimit-Remaining": "119", "X-RateLimit-Reset": "1800000060" },
  );
});
