"use server";

import { revalidatePath } from "next/cache";
import { ApiStatus, VerificationStatus } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { updateApiLifecycle } from "@/lib/catalogue/lifecycle-service";

const verificationValues = Object.values(VerificationStatus) as string[];
const apiStatusValues = Object.values(ApiStatus) as string[];

export type ApiLifecycleState = { status: "idle" | "error" | "success"; message: string };

export async function updateApiLifecycleAction(
  _previous: ApiLifecycleState,
  formData: FormData,
): Promise<ApiLifecycleState> {
  await requireAdmin();

  const apiId = String(formData.get("apiId") ?? "");
  const verificationStatus = String(formData.get("verificationStatus") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!/^[0-9a-f-]{36}$/i.test(apiId)) return { status: "error", message: "The API record identifier is invalid." };
  if (!verificationValues.includes(verificationStatus) || !apiStatusValues.includes(status)) {
    return { status: "error", message: "Choose a valid verification and availability status." };
  }
  if (note.length > 500) return { status: "error", message: "The review note must be 500 characters or fewer." };

  const nextVerification = verificationStatus as VerificationStatus;
  const nextStatus = status as ApiStatus;

  if (nextVerification === VerificationStatus.VERIFIED && !note) {
    return { status: "error", message: "A review note is required when verifying an API. Describe the official evidence you checked." };
  }

  try {
    const slug = await getPrisma().$transaction((tx) =>
      updateApiLifecycle(tx, apiId, nextVerification, nextStatus, note),
    );

    revalidatePath("/admin");
    revalidatePath("/admin/apis");
    revalidatePath(`/admin/apis/${slug}/review`);
    revalidatePath(`/admin/apis/${slug}/history`);
    revalidatePath("/");
    revalidatePath(`/apis/${slug}`);

    return {
      status: "success",
      message: nextStatus === ApiStatus.ACTIVE && nextVerification === VerificationStatus.VERIFIED
        ? "API verified and published. Evidence check dates and the review note were recorded."
        : "API lifecycle updated. This record is hidden unless it is both ACTIVE and VERIFIED.",
    };
  } catch (error) {
    console.error("API lifecycle update failed:", error);
    return { status: "error", message: error instanceof Error ? error.message : "The API lifecycle could not be updated." };
  }
}
