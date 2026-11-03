import assert from "node:assert/strict";
import test from "node:test";
import { evaluateReadiness } from "../../src/lib/ops/readiness";

test("readiness succeeds only when the database check succeeds", async () => {
  const result = await evaluateReadiness(async () => [{ "?column?": 1 }]);

  assert.equal(result.httpStatus, 200);
  assert.deepEqual(result.body, {
    status: "ready",
    checks: { database: "ok" },
  });
});

test("readiness fails closed when the database is unavailable", async () => {
  const result = await evaluateReadiness(async () => {
    throw new Error("connection string must not be exposed");
  });

  assert.equal(result.httpStatus, 503);
  assert.deepEqual(result.body, {
    status: "not_ready",
    checks: { database: "unavailable" },
  });
  assert.equal(JSON.stringify(result.body).includes("connection string"), false);
});
