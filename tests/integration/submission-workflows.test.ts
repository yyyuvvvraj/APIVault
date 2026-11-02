import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { SubmissionKind, SubmissionStatus } from "../../src/generated/prisma/client";
import { getPrisma } from "../../src/lib/db";
import { transitionSubmissionReview } from "../../src/lib/submissions/review-service";

const prisma = getPrisma();
const ids: string[] = [];

async function createSubmission(status = SubmissionStatus.PENDING) {
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
    transitionSubmissionReview(tx, submission.id, SubmissionStatus.REJECTED, "Evidence is insufficient"),
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
      transitionSubmissionReview(tx, submission.id, SubmissionStatus.IN_REVIEW, ""),
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
