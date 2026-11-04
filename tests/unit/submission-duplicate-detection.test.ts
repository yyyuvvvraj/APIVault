import assert from "node:assert/strict";
import test from "node:test";
import { findSubmissionDuplicateCandidates, normalizeHomepageUrl } from "../../src/lib/submissions/duplicate-detection";

const candidates = [
  { id: "one", slug: "weather-api", name: "Weather API", homepageUrl: "https://www.weather.example.com/", provider: { name: "Weather Co" } },
  { id: "two", slug: "other-weather", name: "Other API", homepageUrl: "https://other.example.com", provider: { name: "Other Co" } },
];

test("normalizes homepage host casing, www, trailing slash, query and fragment", () => {
  assert.equal(normalizeHomepageUrl("https://WWW.Weather.Example.com/?ref=home#top"), "https://weather.example.com/");
});

test("rejects non-http homepage URLs", () => {
  assert.equal(normalizeHomepageUrl("javascript:alert(1)"), null);
  assert.equal(normalizeHomepageUrl("file:///etc/passwd"), null);
});

test("detects an exact normalized homepage match", () => {
  const matches = findSubmissionDuplicateCandidates(
    { name: "Different label", providerName: "Different provider", homepageUrl: "https://weather.example.com" },
    candidates,
  );
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, "one");
  assert.equal(matches[0].reason, "Homepage URL match");
});

test("detects matching provider and API name without matching unrelated providers", () => {
  const matches = findSubmissionDuplicateCandidates(
    { name: " weather api ", providerName: "WEATHER CO", homepageUrl: "https://new.example.com" },
    candidates,
  );
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, "one");
  assert.equal(matches[0].reason, "Provider and API name match");
});

test("does not match shared hosting domains or the update target itself", () => {
  assert.deepEqual(
    findSubmissionDuplicateCandidates(
      { name: "New API", providerName: "New Provider", homepageUrl: "https://other.example.com" },
      candidates,
      "two",
    ),
    [],
  );
});

test("same provider and name plus homepage reports combined reason", () => {
  const matches = findSubmissionDuplicateCandidates(
    { name: "Weather API", providerName: "Weather Co", homepageUrl: "https://weather.example.com" },
    candidates,
  );
  assert.equal(matches[0].reason, "Homepage and provider/name match");
});
