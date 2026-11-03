"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { applySubmissionApproval } from "@/lib/submissions/approval-service";

export type ApprovalState = { status: "idle" | "error" | "success"; message: string };

export async function approveSubmissionAction(
  _previous: ApprovalState,
  formData: FormData,
): Promise<ApprovalState> {
  await requireAdmin();
  const submissionId = String(formData.get("submissionId") ?? "");
  const reviewerNote = String(formData.get("reviewerNote") ?? "").trim();

  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) return { status: "error", message: "Invalid submission identifier." };
  if (reviewerNote.length > 4_000) return { status: "error", message: "Approval notes must be 4,000 characters or fewer." };

  try {
    const slug = await getPrisma().$transaction((tx) =>
      applySubmissionApproval(tx, submissionId, reviewerNote),
    );

    revalidatePath("/admin");
    revalidatePath("/admin/apis");
    revalidatePath("/admin/submissions");
    revalidatePath("/");
    revalidatePath("/apis");
    revalidatePath(`/apis/${slug}`);

    return {
      status: "success",
      message: `Submission approved and applied to /${slug}. The API remains hidden pending verification.`,
    };
  } catch (error) {
    console.error("Submission approval failed:", error);
    return { status: "error", message: error instanceof Error ? error.message : "The submission could not be approved." };
  }
}
