import assert from "node:assert/strict";
import test from "node:test";
import { CATALOGUE_REVIEW_INTERVAL_DAYS, getCatalogueFreshnessState, getCatalogueReviewDueAt } from "../../src/lib/catalogue/freshness";

const now = new Date("2026-11-03T00:00:00.000Z");
const day = 24 * 60 * 60 * 1000;

test("freshness report distinguishes never-checked records", () => {
  assert.equal(getCatalogueFreshnessState(null, now), "NEVER_CHECKED");
});

test("records become overdue at exactly 90 days", () => {
  assert.equal(CATALOGUE_REVIEW_INTERVAL_DAYS, 90);
  assert.equal(getCatalogueFreshnessState(new Date(now.getTime() - 90 * day), now), "OVERDUE");
  assert.equal(getCatalogueFreshnessState(new Date(now.getTime() - 89 * day), now), "CURRENT");
});

test("review due date is calculated from the evidence check timestamp", () => {
  const checkedAt = new Date("2026-01-01T00:00:00.000Z");
  assert.equal(getCatalogueReviewDueAt(checkedAt).toISOString(), new Date(checkedAt.getTime() + 90 * day).toISOString());
});

test("custom review intervals are supported by the pure classifier", () => {
  assert.equal(getCatalogueFreshnessState(new Date(now.getTime() - 30 * day), now, 30), "OVERDUE");
});
