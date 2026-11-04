import assert from "node:assert/strict";
import test from "node:test";
import { getModerationPriority } from "../../src/lib/submissions/moderation-priority";

test("prioritizes older pending submissions with duplicate and evidence risks", () => {
  const now = new Date("2026-11-04T12:00:00.000Z");
  const result = getModerationPriority({
    status: "PENDING",
    kind: "CREATE",
    createdAt: new Date("2026-10-30T12:00:00.000Z"),
    payload: {
      name: "Example API",
      providerName: "Example",
      homepageUrl: "https://example.com",
      summary: "An example API",
    },
    sourceKinds: [],
    duplicateCount: 2,
    hasTargetApi: false,
  }, now);

  assert.equal(result.score, 75);
  assert.ok(result.reasons.includes("No source evidence attached"));
  assert.ok(result.reasons.includes("2 possible duplicate matches"));
});

test("does not add metadata gaps for complete payloads with official evidence", () => {
  const now = new Date("2026-11-04T12:00:00.000Z");
  const result = getModerationPriority({
    status: "IN_REVIEW",
    kind: "CREATE",
    createdAt: now,
    payload: {
      name: "Example API",
      providerName: "Example",
      homepageUrl: "https://example.com",
      summary: "An example API",
    },
    sourceKinds: ["OFFICIAL_HOMEPAGE"],
    duplicateCount: 0,
    hasTargetApi: false,
  }, now);

  assert.equal(result.score, 5);
  assert.deepEqual(result.reasons, ["Review in progress"]);
});

test("caps age contribution and reports missing required metadata", () => {
  const now = new Date("2026-11-04T12:00:00.000Z");
  const result = getModerationPriority({
    status: "PENDING",
    kind: "CREATE",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    payload: {},
    sourceKinds: ["OTHER"],
    duplicateCount: 0,
    hasTargetApi: false,
  }, now);

  assert.equal(result.score, 75);
  assert.ok(result.reasons.some((reason) => reason.includes("Missing metadata")));
});
