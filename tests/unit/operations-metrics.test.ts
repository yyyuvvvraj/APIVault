import assert from "node:assert/strict";
import test from "node:test";
import { formatQueueAge, getImportProgress } from "../../src/lib/admin/operations-metrics";

test("formats queue age without negative values", () => {
  const now = new Date("2026-11-04T12:00:00.000Z");
  assert.equal(formatQueueAge(new Date("2026-11-02T11:00:00.000Z"), now), "2d 1h");
  assert.equal(formatQueueAge(new Date("2026-11-04T13:00:00.000Z"), now), "0h");
});

test("clamps import progress and handles empty runs", () => {
  assert.equal(getImportProgress(1, 4), 25);
  assert.equal(getImportProgress(5, 4), 100);
  assert.equal(getImportProgress(-1, 4), 0);
  assert.equal(getImportProgress(0, 0), 0);
});
