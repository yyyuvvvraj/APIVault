import assert from "node:assert/strict";
import test from "node:test";
import { adminCreateApiSchema } from "../../src/lib/validation/admin-api";

const validApi = {
  name: "Weather API",
  providerName: "Weather Company",
  summary: "Reliable weather forecasts for application developers.",
  description: "Forecast and current conditions.",
  homepageUrl: "https://weather.example.com",
  documentationUrl: "",
  baseUrl: "",
  categorySlugs: ["weather-environment"],
  authMethods: ["API_KEY"],
  pricingModel: "FREEMIUM",
  pricingSummary: "",
};

test("admin API schema accepts valid data and normalizes optional blanks", () => {
  const result = adminCreateApiSchema.safeParse(validApi);

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.documentationUrl, undefined);
    assert.equal(result.data.baseUrl, undefined);
    assert.equal(result.data.pricingSummary, undefined);
  }
});

test("admin API schema rejects non-HTTP homepage URLs", () => {
  const result = adminCreateApiSchema.safeParse({
    ...validApi,
    homepageUrl: "javascript:alert(1)",
  });

  assert.equal(result.success, false);
});

test("admin API schema requires at least one category", () => {
  const result = adminCreateApiSchema.safeParse({
    ...validApi,
    categorySlugs: [],
  });

  assert.equal(result.success, false);
});

test("admin API schema rejects duplicate categories", () => {
  const result = adminCreateApiSchema.safeParse({
    ...validApi,
    categorySlugs: ["weather-environment", "weather-environment"],
  });

  assert.equal(result.success, false);
});

test("admin API schema requires UNKNOWN authentication to be selected alone", () => {
  const result = adminCreateApiSchema.safeParse({
    ...validApi,
    authMethods: ["UNKNOWN", "API_KEY"],
  });

  assert.equal(result.success, false);
});

test("admin API schema requires NONE authentication to be selected alone", () => {
  const result = adminCreateApiSchema.safeParse({
    ...validApi,
    authMethods: ["NONE", "API_KEY"],
  });

  assert.equal(result.success, false);
});
