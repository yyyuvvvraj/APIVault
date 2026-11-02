"use server";

import { revalidatePath } from "next/cache";
import { SubmissionStatus } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export type SubmissionReviewState = { status: "idle" | "error" | "success"; message: string };

const validStatuses = new Set<string>(Object.values(SubmissionStatus));

export async function updateSubmissionReviewAction(
  _previous: SubmissionReviewState,
  formData: FormData,
): Promise<SubmissionReviewState> {
  await requireAdmin();

  const id = String(formData.get("submissionId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "");
  const note = String(formData.get("reviewNote") ?? "").trim();

  if (!/^[0-9a-f-]{36}$/i.test(id)) return { status: "error", message: "Invalid submission identifier." };
  if (!validStatuses.has(nextStatus) || nextStatus === SubmissionStatus.APPROVED) {
    return { status: "error", message: "Choose a supported review action." };
  }
  if (note.length > 4_000) return { status: "error", message: "Review notes must be 4,000 characters or fewer." };
  if ((nextStatus === SubmissionStatus.CHANGES_REQUESTED || nextStatus === SubmissionStatus.REJECTED) && note.length < 5) {
    return { status: "error", message: "Add a review note of at least 5 characters for this decision." };
  }

  try {
    await getPrisma().$transaction(async (tx) => {
      const current = await tx.apiSubmission.findUnique({
        where: { id },
        select: { id: true, status: true },
      });
      if (!current) throw new Error("Submission not found.");

      const allowed: Record<SubmissionStatus, SubmissionStatus[]> = {
        PENDING: [SubmissionStatus.IN_REVIEW, SubmissionStatus.CHANGES_REQUESTED, SubmissionStatus.REJECTED],
        IN_REVIEW: [SubmissionStatus.IN_REVIEW, SubmissionStatus.CHANGES_REQUESTED, SubmissionStatus.REJECTED],
        CHANGES_REQUESTED: [SubmissionStatus.IN_REVIEW, SubmissionStatus.REJECTED],
        REJECTED: [],
        APPROVED: [],
      };
      if (!allowed[current.status].includes(nextStatus as SubmissionStatus)) {
        throw new Error(`Cannot move a ${current.status.replaceAll("_", " ")} submission to ${nextStatus.replaceAll("_", " ")}.`);
      }

      await tx.apiSubmission.update({
        where: { id },
        data: {
          status: nextStatus as SubmissionStatus,
          reviewNote: note || null,
          reviewedAt: nextStatus === SubmissionStatus.IN_REVIEW ? null : new Date(),
        },
      });
    });

    revalidatePath("/admin/submissions");
    revalidatePath("/admin");
    return { status: "success", message: "Submission review status updated." };
  } catch (error) {
    console.error("Submission review update failed:", error);
    return { status: "error", message: error instanceof Error ? error.message : "The review decision could not be saved." };
  }
}
