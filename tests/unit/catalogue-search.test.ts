import assert from "node:assert/strict";
import test from "node:test";
import { parseCatalogueFilters, rankCatalogueResults, tokenizeCatalogueQuery } from "../../src/lib/catalogue/search";

test("catalogue filters use safe defaults for empty input", () => {
  assert.deepEqual(
    parseCatalogueFilters({}),
    {
      q: "",
      category: "",
      pricing: "ALL",
      auth: "ALL",
      sort: "relevance",
      page: 1,
      limit: 12,
    },
  );
});

test("catalogue filters normalize whitespace and retain supported values", () => {
  assert.deepEqual(
    parseCatalogueFilters({
      q: "  weather   api  ",
      category: " WEATHER-ENVIRONMENT ",
      pricing: "FREEMIUM",
      auth: "API_KEY",
      sort: "verified",
      page: "4",
      limit: "50",
    }),
    {
      q: "weather api",
      category: "weather-environment",
      pricing: "FREEMIUM",
      auth: "API_KEY",
      sort: "verified",
      page: 4,
      limit: 50,
    },
  );
});

test("catalogue filters reject unsupported enum values safely", () => {
  const filters = parseCatalogueFilters({
    pricing: "FREE-ISH",
    auth: "MAGIC",
    sort: "unknown",
  });

  assert.equal(filters.pricing, "ALL");
  assert.equal(filters.auth, "ALL");
  assert.equal(filters.sort, "relevance");
});

test("catalogue filters clamp pagination and bound search input", () => {
  const filters = parseCatalogueFilters({
    q: "x".repeat(140),
    page: "999999",
    limit: "999",
  });

  assert.equal(filters.q.length, 100);
  assert.equal(filters.page, 10_000);
  assert.equal(filters.limit, 50);
});

test("catalogue filters fall back for invalid pagination", () => {
  const filters = parseCatalogueFilters({ page: "-2", limit: "0" }, 20);

  assert.equal(filters.page, 1);
  assert.equal(filters.limit, 20);
});

test("catalogue filters accept all supported discovery sorts", () => {
  for (const sort of ["relevance", "recent", "verified", "newest", "name"]) {
    assert.equal(parseCatalogueFilters({ sort }).sort, sort);
  }
});

test("catalogue filters reject unsupported sort values", () => {
  assert.equal(parseCatalogueFilters({ sort: "random" }).sort, "relevance");
});

test("search tokenization removes duplicate terms and caps work", () => {
  assert.deepEqual(tokenizeCatalogueQuery(" Weather  API weather "), ["weather", "api"]);
  assert.equal(tokenizeCatalogueQuery("a b c d e f g h i").length, 8);
});

test("relevance ranking prefers exact API names over broad description matches", () => {
  const base = {
    summary: "Weather data for developers",
    description: "An API that can provide weather information",
    provider: { name: "Example Provider", slug: "example-provider" },
    categories: [{ category: { name: "Weather", slug: "weather" } }],
    tags: [],
    featured: false,
    verifiedAt: null,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
  const broad = { ...base, name: "Forecast Data", slug: "forecast-data" };
  const exact = { ...base, name: "Weather API", slug: "weather-api" };

  assert.deepEqual(rankCatalogueResults([broad, exact], "weather api").map((item) => item.name), ["Weather API", "Forecast Data"]);
});

test("relevance ranking uses featured and freshness as deterministic tie breakers", () => {
  const base = {
    name: "Weather API",
    slug: "weather-api",
    summary: "Weather",
    description: null,
    provider: { name: "Example", slug: "example" },
    categories: [],
    tags: [],
    verifiedAt: null,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
  const older = { ...base, featured: false };
  const featured = { ...base, featured: true };

  assert.equal(rankCatalogueResults([older, featured], "weather")[0]?.featured, true);
});
