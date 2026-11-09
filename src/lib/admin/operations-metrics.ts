import { SubmissionStatus } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";

type SubmissionCountClient = Pick<PrismaClient, "apiSubmission">;

export type ModerationQueueAgeMetrics = {
  lessThan24Hours: number;
  oneToThreeDays: number;
  atLeastThreeDays: number;
};

export async function getModerationQueueAgeMetrics(
  db: SubmissionCountClient,
  now = new Date(),
): Promise<ModerationQueueAgeMetrics> {
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const openStatuses = [SubmissionStatus.PENDING, SubmissionStatus.IN_REVIEW];

  const [lessThan24Hours, oneToThreeDays, atLeastThreeDays] = await Promise.all([
    db.apiSubmission.count({
      where: { status: { in: openStatuses }, createdAt: { gt: oneDayAgo } },
    }),
    db.apiSubmission.count({
      where: { status: { in: openStatuses }, createdAt: { lte: oneDayAgo, gt: threeDaysAgo } },
    }),
    db.apiSubmission.count({
      where: { status: { in: openStatuses }, createdAt: { lte: threeDaysAgo } },
    }),
  ]);

  return { lessThan24Hours, oneToThreeDays, atLeastThreeDays };
}

export function formatQueueAge(createdAt: Date, now = new Date()): string {
  const hours = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 3_600_000));
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours === 0 ? `${days}d` : `${days}d ${remainingHours}h`;
}

export function getImportProgress(processed: number, total: number): number {
  if (!Number.isFinite(processed) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((processed / total) * 100)));
}
