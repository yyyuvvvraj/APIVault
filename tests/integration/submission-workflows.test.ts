import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { SubmissionKind, SubmissionStatus } from "../../src/generated/prisma/client";
import { getPrisma } from "../../src/lib/db";
import { transitionSubmissionReview } from "../../src/lib/submissions/review-service";

const prisma = getPrisma();
const ids: string[] = [];

async function createSubmission(status: SubmissionStatus = SubmissionStatus.PENDING) {
  const row = await prisma.apiSubmission.create({
    data: {
      kind: SubmissionKind.CREATE,
      status,
      payload: { invalidFixture: true },
      submitterGithub: "integration-test",
    },
  });
  ids.push(row.id);
  return row;
}

after(async () => {
  await prisma.apiSubmission.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

test("rejection persists the reviewer decision and note", async () => {
  const submission = await createSubmission(SubmissionStatus.IN_REVIEW);
  await prisma.$transaction((tx) =>
    transitionSubmissionReview(tx, submission.id, SubmissionStatus.REJECTED, "Evidence is insufficient", "integration-reviewer"),
  );

  const saved = await prisma.apiSubmission.findUniqueOrThrow({ where: { id: submission.id } });
  assert.equal(saved.status, SubmissionStatus.REJECTED);
  assert.equal(saved.reviewNote, "Evidence is insufficient");
  assert.ok(saved.reviewedAt);
});

test("invalid review transition leaves the stored submission unchanged", async () => {
  const submission = await createSubmission(SubmissionStatus.REJECTED);
  await assert.rejects(
    prisma.$transaction((tx) =>
      transitionSubmissionReview(tx, submission.id, SubmissionStatus.IN_REVIEW, "", "integration-reviewer"),
    ),
    /Cannot move/,
  );
  const saved = await prisma.apiSubmission.findUniqueOrThrow({ where: { id: submission.id } });
  assert.equal(saved.status, SubmissionStatus.REJECTED);
});

test("transaction rollback restores the prior review state after a later write fails", async () => {
  const submission = await createSubmission(SubmissionStatus.IN_REVIEW);
  await assert.rejects(
    prisma.$transaction(async (tx) => {
      await transitionSubmissionReview(tx, submission.id, SubmissionStatus.REJECTED, "Reject this proposal");
      await tx.apiRevision.create({
        data: {
          apiId: randomUUID(),
          action: "CREATED",
          snapshot: { shouldRollback: true },
        },
      });
    }),
  );

  const saved = await prisma.apiSubmission.findUniqueOrThrow({ where: { id: submission.id } });
  assert.equal(saved.status, SubmissionStatus.IN_REVIEW);
  assert.equal(saved.reviewNote, null);
});


test("concurrent reviewer decisions cannot overwrite the first committed decision", async () => {
  const submission = await createSubmission(SubmissionStatus.PENDING);

  const decisions = await Promise.allSettled([
    prisma.$transaction((tx) =>
      transitionSubmissionReview(tx, submission.id, SubmissionStatus.REJECTED, "Reject after review", "integration-reviewer-a"),
    ),
    prisma.$transaction((tx) =>
      transitionSubmissionReview(tx, submission.id, SubmissionStatus.CHANGES_REQUESTED, "Request further evidence", "integration-reviewer-b"),
    ),
  ]);

  assert.equal(decisions.filter((decision) => decision.status === "fulfilled").length, 1);
  assert.equal(decisions.filter((decision) => decision.status === "rejected").length, 1);

  const saved = await prisma.apiSubmission.findUniqueOrThrow({ where: { id: submission.id } });
  assert.ok(
    saved.status === SubmissionStatus.REJECTED ||
    saved.status === SubmissionStatus.CHANGES_REQUESTED,
  );
  assert.ok(saved.reviewNote);
  assert.ok(saved.reviewedAt);
});
