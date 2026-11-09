"use server";

import { revalidatePath } from "next/cache";
import { SubmissionStatus } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { transitionSubmissionReview, submissionReviewError } from "@/lib/submissions/review-service";

export type SubmissionReviewState = { status: "idle" | "error" | "success"; message: string };

const validStatuses = new Set<string>(Object.values(SubmissionStatus));

export async function updateSubmissionReviewAction(
  _previous: SubmissionReviewState,
  formData: FormData,
): Promise<SubmissionReviewState> {
  const session = await requireAdmin();

  const id = String(formData.get("submissionId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "");
  const note = String(formData.get("reviewNote") ?? "").trim();

  if (!/^[0-9a-f-]{36}$/i.test(id)) return { status: "error", message: "Invalid submission identifier." };
  if (!validStatuses.has(nextStatus) || nextStatus === SubmissionStatus.APPROVED) {
    return { status: "error", message: "Choose a supported review action." };
  }
  const reviewError = submissionReviewError(SubmissionStatus.PENDING, nextStatus as SubmissionStatus, note);
  if (reviewError === "Approval must use the dedicated approval workflow.") {
    return { status: "error", message: "Choose a supported review action." };
  }
  if (note.length > 4_000) return { status: "error", message: reviewError ?? "Review notes must be 4,000 characters or fewer." };
  if ((nextStatus === SubmissionStatus.CHANGES_REQUESTED || nextStatus === SubmissionStatus.REJECTED) && note.length < 5) {
    return { status: "error", message: reviewError ?? "Add a review note of at least 5 characters for this decision." };
  }

  try {
    await getPrisma().$transaction(async (tx) => {
      await transitionSubmissionReview(tx, id, nextStatus as SubmissionStatus, note, session.user.id);
    });

    revalidatePath("/admin/submissions");
    revalidatePath("/admin");
    return { status: "success", message: "Submission review status updated." };
  } catch (error) {
    console.error("Submission review update failed:", error);
    return { status: "error", message: error instanceof Error ? error.message : "The review decision could not be saved." };
  }
}
