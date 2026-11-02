import type { Prisma } from "@/generated/prisma/client";
import { ApiStatus, RevisionAction, VerificationStatus } from "@/generated/prisma/client";

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
      sources: { select: { sourceKind: true, url: true, isOfficial: true } },
    },
  });
  if (!api) throw new Error("The API record no longer exists.");

  if (nextVerification === VerificationStatus.VERIFIED) {
    const hasOfficialHomepage = api.sources.some(
      (source) => source.sourceKind === "OFFICIAL_HOMEPAGE" && source.isOfficial && source.url === api.homepageUrl,
    );
    if (!hasOfficialHomepage) throw new Error("Verification requires an official homepage source matching the API homepage URL.");
    if (api.categories.length === 0) throw new Error("Add at least one category before verifying this API.");
    if (api.authMethods.length === 0) throw new Error("Add at least one authentication classification before verifying this API.");
    if (nextStatus !== ApiStatus.ACTIVE) throw new Error("Set the API availability to ACTIVE before verifying and publishing it.");
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
          sourceKind: source.sourceKind, url: source.url, isOfficial: source.isOfficial,
        })),
      },
    },
  });

  return updated.slug;
}
