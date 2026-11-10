import assert from "node:assert/strict";
import test from "node:test";
import { evaluateDiscoveryApproval, type DiscoveryApprovalInput } from "../../src/lib/catalogue/discovery-approval-policy";

function lead(overrides: Partial<DiscoveryApprovalInput> = {}): DiscoveryApprovalInput {
  return {
    name: "Example API",
    originalUrl: "https://provider.example",
    canonicalUrl: "https://provider.example",
    disposition: "READY_FOR_MAINTAINER_REVIEW",
    automatedResearch: {
      hostname: "provider.example",
      research: {
        fetchStatus: "FETCHED",
        httpStatus: 200,
        resolvedUrl: "https://provider.example/",
        title: "Example API",
        description: "Official developer platform",
        candidateLinks: [{ kind: "documentation", url: "https://provider.example/docs" }],
      },
    },
    ...overrides,
  };
}

test("complete research is only promoted to maintainer review, never auto-approved", () => {
  const result = evaluateDiscoveryApproval(lead());
  assert.equal(result.decision, "READY_FOR_MAINTAINER_REVIEW");
  assert.equal(result.score, 100);
  assert.equal(result.requiresHumanApproval, true);
  assert.equal(result.mayPublish, false);
});

test("missing documentation blocks readiness", () => {
  const result = evaluateDiscoveryApproval(lead({
    automatedResearch: {
      research: {
        fetchStatus: "FETCHED", httpStatus: 200,
        resolvedUrl: "https://provider.example/", title: "Example API",
        description: "Developer platform", candidateLinks: [],
      },
    },
  }));
  assert.equal(result.decision, "REVIEW_REQUIRED");
  assert.ok(result.blockers.some((item) => item.includes("documentation")));
});

test("cross-host redirects and documentation links are rejected", () => {
  const result = evaluateDiscoveryApproval(lead({
    automatedResearch: {
      research: {
        fetchStatus: "FETCHED", httpStatus: 200,
        resolvedUrl: "https://unrelated.example/", title: "Example API",
        description: "Developer platform",
        candidateLinks: [{ kind: "documentation", url: "https://unrelated.example/docs" }],
      },
    },
  }));
  assert.equal(result.decision, "REVIEW_REQUIRED");
  assert.ok(result.blockers.some((item) => item.includes("resolved page")));
  assert.ok(result.blockers.some((item) => item.includes("documentation")));
});

test("non-2xx responses and non-HTTPS canonical URLs never pass", () => {
  const result = evaluateDiscoveryApproval(lead({
    canonicalUrl: "http://provider.example",
    automatedResearch: {
      research: {
        fetchStatus: "FETCHED", httpStatus: 403,
        resolvedUrl: "http://provider.example/", title: "Example API",
        description: "Developer platform",
        candidateLinks: [{ kind: "documentation", url: "http://provider.example/docs" }],
      },
    },
  }));
  assert.equal(result.decision, "REVIEW_REQUIRED");
  assert.ok(result.blockers.length >= 2);
});

test("a passing evidence score cannot override a non-ready source disposition", () => {
  const result = evaluateDiscoveryApproval(lead({ disposition: "REVIEW_REQUIRED" }));
  assert.equal(result.score, 100);
  assert.equal(result.decision, "REVIEW_REQUIRED");
});

test("malformed URLs and credential-bearing URLs fail closed", () => {
  const result = evaluateDiscoveryApproval(lead({
    originalUrl: "https://user:password@provider.example",
    canonicalUrl: "not-a-url",
  }));
  assert.equal(result.decision, "REVIEW_REQUIRED");
  assert.equal(result.score, 0);
});
