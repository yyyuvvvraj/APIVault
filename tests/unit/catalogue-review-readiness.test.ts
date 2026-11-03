import assert from "node:assert/strict";
import test from "node:test";
import { getApiReviewReadiness } from "../../src/lib/catalogue/review-readiness";

const completeApi = {
  homepageUrl: "https://example.test",
  documentationUrl: "https://example.test/docs",
  pricingModel: "FREEMIUM",
  pricingSummary: "Free tier and paid plans",
  categories: [{ categoryId: "category-1" }],
  authMethods: [{ method: "API_KEY" }],
  sources: [
    { sourceKind: "OFFICIAL_HOMEPAGE", url: "https://example.test", isOfficial: true },
    { sourceKind: "DOCUMENTATION", url: "https://example.test/docs", isOfficial: true },
    { sourceKind: "PRICING", url: "https://example.test/pricing", isOfficial: true },
  ],
};

test("review readiness accepts complete baseline evidence", () => {
  assert.deepEqual(getApiReviewReadiness(completeApi), { ready: true, gaps: [] });
});

test("review readiness reports missing or mismatched evidence and classifications", () => {
  const result = getApiReviewReadiness({
    ...completeApi,
    documentationUrl: "https://example.test/reference",
    categories: [],
    authMethods: [],
    sources: completeApi.sources.filter((source) => source.sourceKind !== "PRICING"),
  });

  assert.equal(result.ready, false);
  assert.deepEqual(result.gaps, [
    "documentation source missing",
    "pricing evidence missing",
    "category missing",
    "authentication classification missing",
  ]);
});

test("pricing evidence is optional when pricing is unknown and no pricing summary exists", () => {
  const result = getApiReviewReadiness({
    ...completeApi,
    pricingModel: "UNKNOWN",
    pricingSummary: null,
    sources: completeApi.sources.filter((source) => source.sourceKind !== "PRICING"),
  });

  assert.equal(result.gaps.includes("pricing evidence missing"), false);
});
