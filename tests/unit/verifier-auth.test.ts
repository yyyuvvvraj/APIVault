import assert from "node:assert/strict";
import test from "node:test";
import { isVerifierAuthorized } from "../../src/lib/verifier-auth";

const secret = "unit-test-secret-with-more-than-thirty-two-characters";

test("verifier endpoint accepts only the configured bearer secret", () => {
  process.env.VERIFIER_SHARED_SECRET = secret;
  assert.equal(isVerifierAuthorized(new Request("http://localhost/internal", {
    headers: { authorization: `Bearer ${secret}` },
  })), true);
  assert.equal(isVerifierAuthorized(new Request("http://localhost/internal", {
    headers: { authorization: "Bearer wrong-secret" },
  })), false);
  assert.equal(isVerifierAuthorized(new Request("http://localhost/internal")), false);
});

test("verifier endpoints fail closed when the secret is missing or too short", () => {
  delete process.env.VERIFIER_SHARED_SECRET;
  assert.equal(isVerifierAuthorized(new Request("http://localhost/internal", {
    headers: { authorization: `Bearer ${secret}` },
  })), false);
  process.env.VERIFIER_SHARED_SECRET = "short";
  assert.equal(isVerifierAuthorized(new Request("http://localhost/internal", {
    headers: { authorization: "Bearer short" },
  })), false);
  process.env.VERIFIER_SHARED_SECRET = secret;
});
