"use server";

import { revalidatePath } from "next/cache";
import {
  ApiStatus,
  RevisionAction,
  VerificationStatus,
} from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

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

  if (!/^[0-9a-f-]{36}$/i.test(apiId)) {
    return { status: "error", message: "The API record identifier is invalid." };
  }
  if (!verificationValues.includes(verificationStatus) || !apiStatusValues.includes(status)) {
    return { status: "error", message: "Choose a valid verification and availability status." };
  }
  if (note.length > 500) {
    return { status: "error", message: "The review note must be 500 characters or fewer." };
  }

  const nextVerification = verificationStatus as VerificationStatus;
  const nextStatus = status as ApiStatus;
  const prisma = getPrisma();

  try {
    const slug = await prisma.$transaction(async (tx) => {
      const api = await tx.api.findUnique({
        where: { id: apiId },
        include: {
          provider: { select: { name: true } },
          categories: { include: { category: { select: { slug: true } } } },
          authMethods: { select: { method: true } },
          sources: { select: { sourceKind: true, url: true, isOfficial: true } },
        },
      });
      if (!api) throw new Error("The API record no longer exists.");

      if (nextVerification === VerificationStatus.VERIFIED) {
        const hasOfficialHomepage = api.sources.some(
          (source) => source.sourceKind === "OFFICIAL_HOMEPAGE" && source.isOfficial && source.url === api.homepageUrl,
        );
        if (!hasOfficialHomepage) {
          throw new Error("Verification requires an official homepage source matching the API homepage URL.");
        }
        if (api.categories.length === 0) {
          throw new Error("Add at least one category before verifying this API.");
        }
        if (api.authMethods.length === 0) {
          throw new Error("Add at least one authentication classification before verifying this API.");
        }
        if (nextStatus !== ApiStatus.ACTIVE) {
          throw new Error("Set the API availability to ACTIVE before verifying and publishing it.");
        }
      }

      const now = new Date();
      const willBePublic = nextStatus === ApiStatus.ACTIVE && nextVerification === VerificationStatus.VERIFIED;
      const updated = await tx.api.update({
        where: { id: apiId },
        data: {
          status: nextStatus,
          verificationStatus: nextVerification,
          verifiedAt: nextVerification === VerificationStatus.VERIFIED ? now : api.verifiedAt,
          lastCheckedAt: nextVerification === VerificationStatus.VERIFIED ? now : api.lastCheckedAt,
          publishedAt: willBePublic ? (api.publishedAt ?? now) : null,
        },
        include: {
          provider: { select: { name: true } },
          categories: { include: { category: { select: { slug: true } } } },
          authMethods: { select: { method: true } },
          sources: { select: { sourceKind: true, url: true, isOfficial: true } },
        },
      });

      const action = nextVerification === VerificationStatus.VERIFIED
        ? RevisionAction.VERIFIED
        : RevisionAction.STATUS_CHANGED;

      await tx.apiRevision.create({
        data: {
          apiId,
          action,
          summary: note || `Admin changed availability to ${nextStatus} and verification to ${nextVerification}.`,
          snapshot: {
            slug: updated.slug,
            name: updated.name,
            provider: updated.provider.name,
            status: updated.status,
            verificationStatus: updated.verificationStatus,
            verifiedAt: updated.verifiedAt?.toISOString() ?? null,
            lastCheckedAt: updated.lastCheckedAt?.toISOString() ?? null,
            publishedAt: updated.publishedAt?.toISOString() ?? null,
            categorySlugs: updated.categories.map((item) => item.category.slug),
            authMethods: updated.authMethods.map((item) => item.method),
            sources: updated.sources.map((source) => ({
              sourceKind: source.sourceKind,
              url: source.url,
              isOfficial: source.isOfficial,
            })),
          },
        },
      });

      return updated.slug;
    });

    revalidatePath("/admin");
    revalidatePath("/admin/apis");
    revalidatePath(`/admin/apis/${slug}/review`);
    revalidatePath("/");
    revalidatePath(`/apis/${slug}`);

    return {
      status: "success",
      message: nextStatus === ApiStatus.ACTIVE && nextVerification === VerificationStatus.VERIFIED
        ? "API verified and published to the public catalogue."
        : "API lifecycle updated. This record is hidden unless it is both ACTIVE and VERIFIED.",
    };
  } catch (error) {
    console.error("API lifecycle update failed:", error);
    return { status: "error", message: error instanceof Error ? error.message : "The API lifecycle could not be updated." };
  }
}
