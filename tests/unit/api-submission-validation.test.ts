import assert from "node:assert/strict";
import test from "node:test";
import { apiSubmissionSchema } from "../../src/lib/validation/api";

const validSubmission = {
  name: "Weather API",
  providerName: "Weather Company",
  summary: "Reliable weather forecasts for application developers.",
  homepageUrl: "https://weather.example.com",
  documentationUrl: "https://weather.example.com/docs",
  categorySlugs: ["weather-environment"],
  authMethods: ["API_KEY"],
  pricingModel: "FREEMIUM",
  sourceUrls: ["https://weather.example.com/pricing"],
  submitterGithub: "apivault-contributor",
};

test("community submission schema accepts a valid sourced proposal", () => {
  assert.equal(apiSubmissionSchema.safeParse(validSubmission).success, true);
});

test("community submission schema rejects a proposal without evidence URLs", () => {
  assert.equal(
    apiSubmissionSchema.safeParse({ ...validSubmission, sourceUrls: [] }).success,
    false,
  );
});

test("community submission schema rejects non-HTTP evidence URLs", () => {
  assert.equal(
    apiSubmissionSchema.safeParse({
      ...validSubmission,
      sourceUrls: ["file:///etc/passwd"],
    }).success,
    false,
  );
});

test("community submission schema rejects malformed GitHub usernames", () => {
  assert.equal(
    apiSubmissionSchema.safeParse({
      ...validSubmission,
      submitterGithub: "not a valid username",
    }).success,
    false,
  );
});
