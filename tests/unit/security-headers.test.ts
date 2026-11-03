import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../../next.config";

test("Next.js applies baseline security headers to every route", async () => {
  const rules = await nextConfig.headers?.();
  const globalRule = rules?.find((rule) => rule.source === "/:path*");
  const headers = new Map(globalRule?.headers.map(({ key, value }) => [key.toLowerCase(), value]));

  assert.equal(headers.get("x-content-type-options"), "nosniff");
  assert.equal(headers.get("x-frame-options"), "DENY");
  assert.equal(headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.equal(headers.get("permissions-policy"), "camera=(), microphone=(), geolocation=()");
});
