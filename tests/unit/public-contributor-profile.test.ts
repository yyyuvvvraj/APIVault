import assert from "node:assert/strict";
import test from "node:test";
import { toPublicContributorProfile } from "../../src/lib/contributors/public-profile";

const baseProfile = {
  isPublic: true,
  handle: "api-curator",
  displayName: "API Curator",
  bio: "I help improve API metadata.",
  websiteUrl: "https://example.com",
  githubUrl: "https://github.com/api-curator",
  createdAt: new Date("2026-01-15T10:00:00.000Z"),
  approvedContributions: 7,
};

test("private profiles are never serialized for public consumers", () => {
  assert.equal(toPublicContributorProfile({ ...baseProfile, isPublic: false }), null);
});

test("public profile projection contains only explicitly approved fields", () => {
  const result = toPublicContributorProfile({
    ...baseProfile,
    email: "private@example.com",
    userId: "internal-user-id",
    accountId: "internal-account-id",
  } as typeof baseProfile & { email: string; userId: string; accountId: string });

  assert.deepEqual(result, {
    handle: "api-curator",
    displayName: "API Curator",
    bio: "I help improve API metadata.",
    websiteUrl: "https://example.com",
    githubUrl: "https://github.com/api-curator",
    joinedAt: baseProfile.createdAt,
    approvedContributions: 7,
  });
  assert.equal("email" in (result ?? {}), false);
  assert.equal("userId" in (result ?? {}), false);
  assert.equal("accountId" in (result ?? {}), false);
});

test("public profile can omit optional biography and links", () => {
  const result = toPublicContributorProfile({
    ...baseProfile,
    bio: null,
    websiteUrl: null,
    githubUrl: null,
    approvedContributions: 0,
  });

  assert.ok(result);
  assert.equal(result.bio, null);
  assert.equal(result.websiteUrl, null);
  assert.equal(result.githubUrl, null);
  assert.equal(result.approvedContributions, 0);
});
