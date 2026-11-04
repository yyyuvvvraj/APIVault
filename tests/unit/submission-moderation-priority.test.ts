import { describe, expect, it } from "vitest";
import { getModerationPriority } from "@/lib/submissions/moderation-priority";

describe("getModerationPriority", () => {
  const now = new Date("2026-11-04T12:00:00.000Z");
  const completePayload = {
    name: "Example API",
    providerName: "Example",
    homepageUrl: "https://example.com",
    summary: "An example API",
  };

  it("prioritizes older pending submissions with duplicate and evidence risks", () => {
    const result = getModerationPriority({
      status: "PENDING",
      kind: "CREATE",
      createdAt: new Date("2026-10-30T12:00:00.000Z"),
      payload: completePayload,
      sourceKinds: [],
      duplicateCount: 2,
      hasTargetApi: false,
    }, now);

    expect(result.score).toBe(75);
    expect(result.reasons).toContain("No source evidence attached");
    expect(result.reasons).toContain("2 possible duplicate matches");
  });

  it("does not add metadata gaps for complete payloads with official evidence", () => {
    const result = getModerationPriority({
      status: "IN_REVIEW",
      kind: "CREATE",
      createdAt: now,
      payload: completePayload,
      sourceKinds: ["OFFICIAL_HOMEPAGE"],
      duplicateCount: 0,
      hasTargetApi: false,
    }, now);

    expect(result.score).toBe(5);
    expect(result.reasons).toEqual(["Review in progress"]);
  });

  it("caps age contribution and reports missing required metadata", () => {
    const result = getModerationPriority({
      status: "PENDING",
      kind: "CREATE",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      payload: {},
      sourceKinds: ["OTHER"],
      duplicateCount: 0,
      hasTargetApi: false,
    }, now);

    expect(result.score).toBe(75);
    expect(result.reasons.some((reason) => reason.includes("Missing metadata"))).toBe(true);
  });
});
