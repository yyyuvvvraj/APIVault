import { SubmissionStatus, type Prisma } from "@/generated/prisma/client";

const allowedTransitions: Record<SubmissionStatus, SubmissionStatus[]> = {
  PENDING: [SubmissionStatus.IN_REVIEW, SubmissionStatus.CHANGES_REQUESTED, SubmissionStatus.REJECTED],
  IN_REVIEW: [SubmissionStatus.IN_REVIEW, SubmissionStatus.CHANGES_REQUESTED, SubmissionStatus.REJECTED],
  CHANGES_REQUESTED: [SubmissionStatus.IN_REVIEW, SubmissionStatus.REJECTED],
  REJECTED: [],
  APPROVED: [],
};

export function submissionReviewError(
  current: SubmissionStatus,
  next: SubmissionStatus,
  note: string,
): string | null {
  if (next === SubmissionStatus.APPROVED) return "Approval must use the dedicated approval workflow.";
  if (!allowedTransitions[current].includes(next)) {
    return `Cannot move a ${current.replaceAll("_", " ")} submission to ${next.replaceAll("_", " ")}.`;
  }
  if ((next === SubmissionStatus.CHANGES_REQUESTED || next === SubmissionStatus.REJECTED) && note.trim().length < 5) {
    return "Add a review note of at least 5 characters for this decision.";
  }
  if (note.length > 4_000) return "Review notes must be 4,000 characters or fewer.";
  return null;
}

export async function transitionSubmissionReview(
  tx: Prisma.TransactionClient,
  id: string,
  next: SubmissionStatus,
  note: string,
  reviewerUserId: string,
) {
  const current = await tx.apiSubmission.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!current) throw new Error("Submission not found.");

  const error = submissionReviewError(current.status, next, note);
  if (error) throw new Error(error);

  // Compare-and-set prevents two reviewers from overwriting each other's decision.
  const result = await tx.apiSubmission.updateMany({
    where: { id, status: current.status },
    data: {
      status: next,
      reviewNote: note.trim() || null,
      reviewedAt: next === SubmissionStatus.IN_REVIEW ? null : new Date(),
    },
  });

  if (result.count !== 1) {
    throw new Error("This submission was updated by another reviewer. Refresh and review the latest status.");
  }

  await tx.submissionReviewEvent.create({
    data: {
      submissionId: id,
      previousStatus: current.status,
      nextStatus: next,
      note: note.trim() || null,
      reviewerUserId,
    },
  });

  return tx.apiSubmission.findUniqueOrThrow({ where: { id } });
}
