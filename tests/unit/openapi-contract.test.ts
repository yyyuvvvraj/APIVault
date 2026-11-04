import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

type OpenApiOperation = {
  parameters?: Array<{ name: string; in: string }>;
  responses?: Record<string, { description?: string; headers?: Record<string, unknown> }>;
};

const publicPaths = ["/apis", "/apis/{slug}", "/categories"];

test("published OpenAPI document describes every public v1 route", () => {
  const document = JSON.parse(readFileSync("docs/openapi.json", "utf8")) as {
    openapi: string;
    paths: Record<string, { get?: OpenApiOperation }>;
    components: { schemas: Record<string, unknown> };
  };
  assert.equal(document.openapi, "3.1.0");
  for (const path of publicPaths) assert.ok(document.paths[path]?.get, `${path} must document GET`);
  assert.ok(document.components.schemas.Error);
  assert.ok(document.components.schemas.Pagination);
});

test("every public GET documents conditional requests and response validators", () => {
  const document = JSON.parse(readFileSync("docs/openapi.json", "utf8")) as {
    paths: Record<string, { get?: OpenApiOperation }>;
  };
  for (const path of publicPaths) {
    const operation = document.paths[path]?.get;
    assert.ok(operation, `${path} must document GET`);
    assert.ok(operation.parameters?.some((parameter) => parameter.name === "If-None-Match" && parameter.in === "header"), `${path} must document If-None-Match`);
    assert.ok(operation.responses?.["304"], `${path} must document 304 Not Modified`);
    assert.ok(operation.responses?.["200"]?.headers?.ETag, `${path} must document the ETag response header`);
  }
});

test("served OpenAPI source and documentation copy stay in sync", () => {
  const source = JSON.parse(readFileSync("src/lib/openapi.json", "utf8"));
  const docs = JSON.parse(readFileSync("docs/openapi.json", "utf8"));
  assert.deepEqual(source, docs);
});
