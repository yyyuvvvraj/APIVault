import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("developer reference documents the public API integration contract", () => {
  const reference = readFileSync("docs/API_REFERENCE.md", "utf8");
  for (const route of ["/api/v1/apis", "/api/v1/apis/{slug}", "/api/v1/categories"]) {
    assert.ok(reference.includes(route), `reference must include ${route}`);
  }
  for (const section of ["Conditional requests and caching", "Response metadata and errors", "Optional APIVault API keys", "JavaScript example", "Python example", "Playground"]) {
    assert.ok(reference.includes(section), `reference must include ${section}`);
  }
  assert.match(reference, /catalogue:read/);
  assert.match(reference, /Retry-After/);
  assert.match(reference, /X-RateLimit-Remaining/);
  assert.match(reference, /does not increase the default 120 requests/);
});

test("OpenAPI contract release version matches the current application release", () => {
  const source = JSON.parse(readFileSync("src/lib/openapi.json", "utf8"));
  const docs = JSON.parse(readFileSync("docs/openapi.json", "utf8"));
  assert.equal(source.info.version, "0.4.0");
  assert.deepEqual(source, docs);
});
