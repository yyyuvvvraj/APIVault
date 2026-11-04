import assert from "node:assert/strict";
import test from "node:test";
import { toPublicContributorProfile } from "../../src/lib/contributors/public-profile";

const profile = {
  isPublic: true,
  handle: "api-builder",
  displayName: "API Builder",
  bio: "I contribute APIs.",
  websiteUrl: "https://example.com",
  githubUrl: "https://github.com/api-builder",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  approvedContributions: 4,
  email: "private@example.com",
  userId: "private-user-id",
};

test("private contributor profiles are not serializable for public views", () => {
  assert.equal(toPublicContributorProfile({ ...profile, isPublic: false }), null);
});

test("public contributor projection exposes only explicitly approved fields", () => {
  const result = toPublicContributorProfile(profile);
  assert.deepEqual(result, {
    handle: "api-builder",
    displayName: "API Builder",
    bio: "I contribute APIs.",
    websiteUrl: "https://example.com",
    githubUrl: "https://github.com/api-builder",
    joinedAt: new Date("2026-01-01T00:00:00.000Z"),
    approvedContributions: 4,
  });
  assert.equal("email" in (result ?? {}), false);
  assert.equal("userId" in (result ?? {}), false);
});
