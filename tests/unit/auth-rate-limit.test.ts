import assert from "node:assert/strict";
import test from "node:test";
import { isAuthRateLimitEnabled } from "@/lib/auth-rate-limit";

test("auth rate limits remain enabled by default", () => {
  assert.equal(isAuthRateLimitEnabled({}), true);
  assert.equal(isAuthRateLimitEnabled({ CI: "true" }), true);
  assert.equal(isAuthRateLimitEnabled({ E2E_TEST_MODE: "true" }), true);
});

test("auth rate limits are disabled only for the explicit CI E2E environment", () => {
  assert.equal(isAuthRateLimitEnabled({ CI: "true", E2E_TEST_MODE: "true" }), false);
  assert.equal(isAuthRateLimitEnabled({ CI: "false", E2E_TEST_MODE: "true" }), true);
  assert.equal(isAuthRateLimitEnabled({ CI: "true", E2E_TEST_MODE: "false" }), true);
});
