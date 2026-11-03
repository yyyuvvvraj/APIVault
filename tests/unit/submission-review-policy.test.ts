import assert from "node:assert/strict";
import test from "node:test";
import { SubmissionStatus } from "../../src/generated/prisma/client";
import { submissionReviewError } from "../../src/lib/submissions/review-service";

test("pending submissions can enter review, request changes, or be rejected", () => {
  for (const next of [SubmissionStatus.IN_REVIEW, SubmissionStatus.CHANGES_REQUESTED, SubmissionStatus.REJECTED]) {
    assert.equal(submissionReviewError(SubmissionStatus.PENDING, next, "Useful reviewer note"), null);
  }
});

test("changes-requested submissions can return to review or be rejected", () => {
  assert.equal(submissionReviewError(SubmissionStatus.CHANGES_REQUESTED, SubmissionStatus.IN_REVIEW, ""), null);
  assert.equal(submissionReviewError(SubmissionStatus.CHANGES_REQUESTED, SubmissionStatus.REJECTED, "Not acceptable"), null);
});

test("terminal states cannot transition", () => {
  assert.match(submissionReviewError(SubmissionStatus.REJECTED, SubmissionStatus.IN_REVIEW, "") ?? "", /Cannot move/);
  assert.match(submissionReviewError(SubmissionStatus.APPROVED, SubmissionStatus.REJECTED, "Nope") ?? "", /Cannot move/);
});

test("approval cannot bypass dedicated approval workflow", () => {
  assert.match(submissionReviewError(SubmissionStatus.IN_REVIEW, SubmissionStatus.APPROVED, "") ?? "", /dedicated approval/);
});

test("rejection and change requests require meaningful notes", () => {
  assert.match(submissionReviewError(SubmissionStatus.PENDING, SubmissionStatus.REJECTED, "bad") ?? "", /at least 5/);
  assert.match(submissionReviewError(SubmissionStatus.PENDING, SubmissionStatus.CHANGES_REQUESTED, "") ?? "", /at least 5/);
});

test("review notes are bounded", () => {
  assert.match(submissionReviewError(SubmissionStatus.PENDING, SubmissionStatus.IN_REVIEW, "x".repeat(4001)) ?? "", /4,000/);
});
