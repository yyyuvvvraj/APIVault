import assert from "node:assert/strict";
import test from "node:test";
import { parseCatalogueFilters } from "../../src/lib/catalogue/search";

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

test("catalogue filters normalize and retain supported values", () => {
  assert.deepEqual(
    parseCatalogueFilters({
      q: "  weather api  ",
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
