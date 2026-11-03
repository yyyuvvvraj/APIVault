import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("published OpenAPI document describes every public v1 route", () => {
  const document = JSON.parse(readFileSync("docs/openapi.json", "utf8")) as {
    openapi: string;
    paths: Record<string, Record<string, unknown>>;
    components: { schemas: Record<string, unknown> };
  };

  assert.equal(document.openapi, "3.1.0");
  assert.deepEqual(Object.keys(document.paths).sort(), ["/apis", "/apis/{slug}", "/categories"]);
  assert.ok(document.paths["/apis"]?.get);
  assert.ok(document.paths["/apis/{slug}"]?.get);
  assert.ok(document.paths["/categories"]?.get);
  assert.ok(document.components.schemas.Error);
  assert.ok(document.components.schemas.Pagination);
});
