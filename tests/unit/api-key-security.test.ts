import assert from "node:assert/strict";
import test from "node:test";
import { generateApiKeySecret, hashApiKey } from "@/lib/api-keys";

test("API key secrets use the public prefix and sufficient random material", () => {
  const generated = generateApiKeySecret();
  assert.match(generated.secret, /^av_live_[A-Za-z0-9_-]{40,}$/);
  assert.equal(generated.prefix, generated.secret.slice(0, 16));
  assert.match(generated.hash, /^[a-f0-9]{64}$/);
  assert.notEqual(generated.secret, generated.hash);
});

test("API key hashing is deterministic and one-way formatted", () => {
  const secret = "av_live_example-secret-for-hash-test";
  assert.equal(hashApiKey(secret), hashApiKey(secret));
  assert.match(hashApiKey(secret), /^[a-f0-9]{64}$/);
  assert.notEqual(hashApiKey(secret), secret);
});
