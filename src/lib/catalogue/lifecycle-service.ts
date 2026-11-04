import type { Prisma } from "@/generated/prisma/client";
import { ApiStatus, RevisionAction, VerificationStatus } from "@/generated/prisma/client";

export function verificationReviewNoteError(note: string): string | null {
  const normalized = note.trim();
  if (!normalized) return "A review note is required before verifying an API.";
  if (normalized.length < 5) return "The review note must contain at least 5 characters.";
  if (normalized.length > 500) return "The review note must be 500 characters or fewer.";
  return null;
}

export async function updateApiLifecycle(
  tx: Prisma.TransactionClient,
  apiId: string,
  nextVerification: VerificationStatus,
  nextStatus: ApiStatus,
  note: string,
): Promise<string> {
  const api = await tx.api.findUnique({
    where: { id: apiId },
    include: {
      provider: { select: { name: true } },
      categories: { include: { category: { select: { slug: true } } } },
      authMethods: { select: { method: true } },
      sources: { select: { sourceKind: true, url: true, isOfficial: true, checkedAt: true } },
    },
  });
  if (!api) throw new Error("The API record no longer exists.");

  if (nextVerification === VerificationStatus.VERIFIED) {
    if (!api.documentationUrl?.startsWith("https://")) {
      throw new Error("Verification requires an official HTTPS documentation URL.");
    }
    const hasOfficialHomepage = api.sources.some(
      (source) => source.sourceKind === "OFFICIAL_HOMEPAGE" && source.isOfficial && source.url === api.homepageUrl,
    );
    if (!hasOfficialHomepage) throw new Error("Verification requires an official homepage source matching the API homepage URL.");
    if (api.categories.length === 0) throw new Error("Add at least one category before verifying this API.");
    if (api.authMethods.length === 0) throw new Error("Add at least one authentication classification before verifying this API.");
    if (nextStatus !== ApiStatus.ACTIVE) throw new Error("Set the API availability to ACTIVE before verifying and publishing it.");
    if (!note.trim()) throw new Error("Add a review note describing the evidence checked before verifying this API.");
  }

  const now = new Date();
  const willBePublic = nextStatus === ApiStatus.ACTIVE && nextVerification === VerificationStatus.VERIFIED;

  // A verification action is an explicit maintainer attestation that the linked
  // evidence was reviewed now. Keep per-source timestamps as well as API-level
  // timestamps so the review page and immutable revision agree on provenance.
  if (nextVerification === VerificationStatus.VERIFIED) {
    await tx.apiSource.updateMany({
      where: { apiId },
      data: { checkedAt: now },
    });
  }

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
      sources: { select: { sourceKind: true, url: true, isOfficial: true, checkedAt: true } },
    },
  });

  await tx.apiRevision.create({
    data: {
      apiId,
      action: nextVerification === VerificationStatus.VERIFIED ? RevisionAction.VERIFIED : RevisionAction.STATUS_CHANGED,
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
          checkedAt: source.checkedAt?.toISOString() ?? null,
        })),
      },
    },
  });

  return updated.slug;
}
