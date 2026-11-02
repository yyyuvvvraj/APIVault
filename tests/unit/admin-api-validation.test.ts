import assert from "node:assert/strict";
import test from "node:test";
import { adminCreateApiSchema } from "../../src/lib/validation/admin-api";

const validApi = {
  name: "Weather API", providerName: "Weather Company",
  summary: "Reliable weather forecasts for application developers.",
  description: "Forecast and current conditions.",
  homepageUrl: "https://weather.example.com", documentationUrl: "", baseUrl: "",
  categorySlugs: ["weather-environment"], authMethods: ["API_KEY"],
  pricingModel: "FREEMIUM", pricingSummary: "",
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
  assert.equal(adminCreateApiSchema.safeParse({ ...validApi, homepageUrl: "javascript:alert(1)" }).success, false);
});

test("admin API schema requires at least one category", () => {
  assert.equal(adminCreateApiSchema.safeParse({ ...validApi, categorySlugs: [] }).success, false);
});

test("admin API schema rejects duplicate categories", () => {
  assert.equal(adminCreateApiSchema.safeParse({ ...validApi, categorySlugs: ["weather-environment", "weather-environment"] }).success, false);
});

test("UNKNOWN authentication must be selected alone", () => {
  assert.equal(adminCreateApiSchema.safeParse({ ...validApi, authMethods: ["UNKNOWN", "API_KEY"] }).success, false);
});

test("NONE authentication must be selected alone", () => {
  assert.equal(adminCreateApiSchema.safeParse({ ...validApi, authMethods: ["NONE", "API_KEY"] }).success, false);
});
