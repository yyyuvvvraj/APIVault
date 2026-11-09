import assert from "node:assert/strict";
import test from "node:test";
import { formatQueueAge, getImportProgress, getModerationQueueAgeMetrics } from "../../src/lib/admin/operations-metrics";
import { SubmissionStatus, type PrismaClient } from "../../src/generated/prisma/client";

test("formats queue age without negative values", () => {
  const now = new Date("2026-11-04T12:00:00.000Z");
  assert.equal(formatQueueAge(new Date("2026-11-02T11:00:00.000Z"), now), "2d 1h");
  assert.equal(formatQueueAge(new Date("2026-11-04T13:00:00.000Z"), now), "0h");
});

test("clamps import progress and handles empty runs", () => {
  assert.equal(getImportProgress(1, 4), 25);
  assert.equal(getImportProgress(5, 4), 100);
  assert.equal(getImportProgress(-1, 4), 0);
  assert.equal(getImportProgress(0, 0), 0);
});

test("moderation queue age metrics use exact 24-hour and 3-day query boundaries", async () => {
  type CapturedWhere = {
    status: { in: SubmissionStatus[] };
    createdAt: { gt?: Date; lte?: Date };
  };
  const queries: CapturedWhere[] = [];
  const fakeDb = {
    apiSubmission: {
      count: async ({ where }: { where: CapturedWhere }) => {
        queries.push(where);
        return queries.length;
      },
    },
  } as unknown as Pick<PrismaClient, "apiSubmission">;
  const now = new Date("2026-11-09T12:00:00.000Z");
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const metrics = await getModerationQueueAgeMetrics(fakeDb, now);

  assert.deepEqual(metrics, {
    lessThan24Hours: 1,
    oneToThreeDays: 2,
    atLeastThreeDays: 3,
  });
  assert.deepEqual(queries.map((query) => query.createdAt), [
    { gt: oneDayAgo },
    { lte: oneDayAgo, gt: threeDaysAgo },
    { lte: threeDaysAgo },
  ]);
  for (const query of queries) {
    assert.deepEqual(query.status.in, [SubmissionStatus.PENDING, SubmissionStatus.IN_REVIEW]);
  }
});
