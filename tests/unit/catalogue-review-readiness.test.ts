import assert from "node:assert/strict";
import test from "node:test";
import { getApiReviewReadiness } from "../../src/lib/catalogue/review-readiness";

const checkedAt = new Date("2026-10-01T00:00:00.000Z");
const completeApi = {
  homepageUrl: "https://example.test",
  documentationUrl: "https://example.test/docs",
  pricingModel: "FREEMIUM",
  pricingSummary: "Free tier and paid plans",
  categories: [{ categoryId: "category-1" }],
  authMethods: [{ method: "API_KEY" }],
  sources: [
    { sourceKind: "OFFICIAL_HOMEPAGE", url: "https://example.test", isOfficial: true, checkedAt },
    { sourceKind: "DOCUMENTATION", url: "https://example.test/docs", isOfficial: true, checkedAt },
    { sourceKind: "PRICING", url: "https://example.test/pricing", isOfficial: true, checkedAt },
    { sourceKind: "AUTHENTICATION", url: "https://example.test/docs/auth", isOfficial: true, checkedAt },
  ],
};

const reviewDate = new Date("2026-11-04T00:00:00.000Z");

test("review readiness accepts complete, recently reviewed official evidence", () => {
  assert.deepEqual(getApiReviewReadiness(completeApi, reviewDate), { ready: true, gaps: [] });
});

test("review readiness reports missing or mismatched official evidence and classifications", () => {
  const result = getApiReviewReadiness({
    ...completeApi,
    documentationUrl: "https://example.test/reference",
    categories: [],
    authMethods: [],
    sources: completeApi.sources.filter((source) => source.sourceKind !== "PRICING"),
  }, reviewDate);

  assert.equal(result.ready, false);
  assert.deepEqual(result.gaps, [
    "official documentation source missing",
    "official pricing evidence missing",
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
  }, reviewDate);

  assert.equal(result.gaps.includes("official pricing evidence missing"), false);
});

test("non-official sources cannot satisfy documentation, pricing, or authentication evidence", () => {
  const result = getApiReviewReadiness({
    ...completeApi,
    sources: completeApi.sources.map((source) =>
      source.sourceKind === "AUTHENTICATION"
        ? { ...source, isOfficial: false }
        : source,
    ),
  }, reviewDate);

  assert.deepEqual(result.gaps, ["official authentication evidence missing"]);
});

test("review readiness flags missing official source review dates", () => {
  const result = getApiReviewReadiness({
    ...completeApi,
    sources: completeApi.sources.map((source) => ({ ...source, checkedAt: null })),
  }, reviewDate);

  assert.deepEqual(result.gaps, ["official source review date missing"]);
});

test("review readiness flags official evidence older than 180 days", () => {
  const oldDate = new Date("2025-01-01T00:00:00.000Z");
  const result = getApiReviewReadiness({
    ...completeApi,
    sources: completeApi.sources.map((source) => ({ ...source, checkedAt: oldDate })),
  }, reviewDate);

  assert.deepEqual(result.gaps, ["official source evidence older than 180 days"]);
});

test("unknown authentication remains explicit and does not require an auth evidence source", () => {
  const result = getApiReviewReadiness({
    ...completeApi,
    authMethods: [{ method: "UNKNOWN" }],
    sources: completeApi.sources.filter((source) => source.sourceKind !== "AUTHENTICATION"),
  }, reviewDate);

  assert.equal(result.gaps.includes("official authentication evidence missing"), false);
});
