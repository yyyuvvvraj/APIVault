import assert from "node:assert/strict";
import test from "node:test";
import { generateApiKeySecret, hashApiKey } from "../../src/lib/api-keys";

test("API key hashes are deterministic SHA-256 digests, not plaintext", () => {
  const secret = "av_live_example-secret";
  const first = hashApiKey(secret);

  assert.equal(first, hashApiKey(secret));
  assert.notEqual(first, secret);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, hashApiKey(`${secret}-different`));
});

test("generated API keys use the live prefix and a 256-bit URL-safe secret", () => {
  const generated = generateApiKeySecret();

  assert.match(generated.secret, /^av_live_[A-Za-z0-9_-]{43}$/);
  assert.equal(generated.prefix, generated.secret.slice(0, 16));
  assert.match(generated.hash, /^[a-f0-9]{64}$/);
  assert.equal(generated.hash, hashApiKey(generated.secret));
  assert.notEqual(generated.hash, generated.secret);
});

test("generated API key secrets are unique across repeated generations", () => {
  const secrets = Array.from({ length: 100 }, () => generateApiKeySecret().secret);
  assert.equal(new Set(secrets).size, secrets.length);
});
