import assert from "node:assert/strict";
import test from "node:test";
import { buildCatalogueReleaseReport, type CatalogueReleaseCandidate } from "../../src/lib/catalogue/release-report";

function candidate(overrides: Partial<CatalogueReleaseCandidate> = {}): CatalogueReleaseCandidate {
  return {
    slug: "weather-api",
    name: "Weather API",
    status: "ACTIVE",
    verificationStatus: "VERIFIED",
    publishedAt: new Date("2026-11-01T00:00:00.000Z"),
    provider: { name: "Example Provider" },
    categories: [{ category: { name: "Weather" } }],
    sources: [{ url: "https://provider.example/api", isOfficial: true }],
    ...overrides,
  };
}

test("release report counts only published, active, verified APIs with provider, category, and official HTTPS evidence", () => {
  const report = buildCatalogueReleaseReport([
    candidate(),
    candidate({ slug: "pending-api", name: "Pending API", verificationStatus: "PENDING_REVIEW" }),
    candidate({ slug: "no-source", name: "No Source API", sources: [] }),
    candidate({ slug: "no-category", name: "No Category API", categories: [] }),
    candidate({ slug: "unpublished", name: "Unpublished API", publishedAt: null }),
  ], new Date("2026-11-09T12:00:00.000Z"));

  assert.equal(report.generatedAt, "2026-11-09T12:00:00.000Z");
  assert.equal(report.totalRecords, 5);
  assert.equal(report.eligibleCount, 1);
  assert.equal(report.excludedCount, 4);
  assert.equal(report.excludedByReason.not_verified, 1);
  assert.equal(report.excludedByReason.missing_official_https_source, 1);
  assert.equal(report.excludedByReason.missing_category, 1);
  assert.equal(report.excludedByReason.not_published, 1);
});

test("release report rejects non-HTTPS and non-official source URLs", () => {
  const report = buildCatalogueReleaseReport([
    candidate({ sources: [{ url: "http://provider.example", isOfficial: true }] }),
    candidate({ slug: "unofficial", name: "Unofficial API", sources: [{ url: "https://community.example", isOfficial: false }] }),
  ]);

  assert.equal(report.eligibleCount, 0);
  assert.equal(report.excludedByReason.missing_official_https_source, 2);
});

test("release report conservatively counts duplicate provider and API-name identities once", () => {
  const report = buildCatalogueReleaseReport([
    candidate(),
    candidate({ slug: "weather-api-copy", name: " weather   api " }),
  ]);

  assert.equal(report.eligibleCount, 1);
  assert.equal(report.excludedByReason.duplicate_provider_name, 1);
  assert.equal(report.eligibleApis[0].slug, "weather-api");
});

test("category and provider breakdowns are deterministic", () => {
  const report = buildCatalogueReleaseReport([
    candidate({ provider: { name: "Z Provider" }, categories: [{ category: { name: "Weather" } }, { category: { name: "Science" } }] }),
    candidate({ slug: "maps-api", name: "Maps API", provider: { name: "A Provider" }, categories: [{ category: { name: "Maps" } }] }),
  ]);

  assert.deepEqual(report.categoryBreakdown.map((item) => item.category), ["Maps", "Science", "Weather"]);
  assert.deepEqual(report.providerBreakdown.map((item) => item.provider), ["A Provider", "Z Provider"]);
});
