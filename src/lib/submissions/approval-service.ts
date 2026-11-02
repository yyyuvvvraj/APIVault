import type { Prisma } from "@/generated/prisma/client";
import {
  ApiStatus, RevisionAction, SourceKind, SubmissionKind, SubmissionStatus, VerificationStatus,
} from "@/generated/prisma/client";
import { apiSubmissionSchema } from "@/lib/validation/api";

function slugify(value: string, maxLength: number) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, maxLength);
}

async function resolveProvider(tx: Prisma.TransactionClient, providerName: string) {
  const existing = await tx.apiProvider.findFirst({
    where: { name: { equals: providerName, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (existing) return existing;
  const base = slugify(providerName, 120) || "provider";
  let slug = base;
  let suffix = 2;
  while (await tx.apiProvider.findUnique({ where: { slug }, select: { id: true } })) {
    const tail = `-${suffix++}`;
    slug = `${base.slice(0, 120 - tail.length)}${tail}`;
  }
  return tx.apiProvider.create({ data: { slug, name: providerName }, select: { id: true, name: true } });
}

async function upsertApiSources(
  tx: Prisma.TransactionClient, apiId: string, homepageUrl: string,
  documentationUrl: string | undefined,
  sourceRows: { sourceKind: SourceKind; url: string; notes?: string | null }[],
) {
  const evidence = new Map<string, { sourceKind: SourceKind; notes?: string | null }>();
  for (const source of sourceRows) evidence.set(source.url, { sourceKind: source.sourceKind, notes: source.notes });
  evidence.set(homepageUrl, { sourceKind: SourceKind.OFFICIAL_HOMEPAGE });
  if (documentationUrl) evidence.set(documentationUrl, { sourceKind: SourceKind.DOCUMENTATION });
  for (const [url, source] of evidence) {
    await tx.apiSource.upsert({
      where: { apiId_url: { apiId, url } },
      create: { apiId, url, sourceKind: source.sourceKind,
        isOfficial: source.sourceKind === SourceKind.OFFICIAL_HOMEPAGE || source.sourceKind === SourceKind.DOCUMENTATION,
        notes: source.notes ?? null },
      update: { sourceKind: source.sourceKind,
        isOfficial: source.sourceKind === SourceKind.OFFICIAL_HOMEPAGE || source.sourceKind === SourceKind.DOCUMENTATION,
        notes: source.notes ?? null },
    });
  }
}

export async function applySubmissionApproval(
  tx: Prisma.TransactionClient, submissionId: string, reviewerNote: string,
): Promise<string> {

      const submission = await tx.apiSubmission.findUnique({
        where: { id: submissionId },
        include: { sources: { select: { sourceKind: true, url: true, notes: true } } },
      });
      if (!submission) throw new Error("Submission not found.");
      if (submission.status !== SubmissionStatus.IN_REVIEW) {
        throw new Error("Move the submission to IN_REVIEW before approving it.");
      }

      const parsed = apiSubmissionSchema.safeParse(submission.payload);
      if (!parsed.success) {
        throw new Error(`The stored submission payload is invalid: ${parsed.error.issues[0]?.message ?? "Check submitted fields"}`);
      }
      const input = parsed.data;
      const provider = await resolveProvider(tx, input.providerName);

      const duplicate = await tx.api.findFirst({
        where: {
          providerId: provider.id,
          name: { equals: input.name, mode: "insensitive" },
          ...(submission.targetApiId ? { id: { not: submission.targetApiId } } : {}),
        },
        select: { slug: true },
      });
      if (duplicate) throw new Error(`An API with this name already exists for this provider (/${duplicate.slug}).`);

      const categories = await tx.category.findMany({
        where: { slug: { in: input.categorySlugs } },
        select: { id: true, slug: true },
      });
      if (categories.length !== input.categorySlugs.length) {
        throw new Error("One or more submitted categories no longer exist. Update the taxonomy or request a revised submission.");
      }

      const sources = [...submission.sources];
      for (const url of input.sourceUrls) {
        if (!sources.some((source) => source.url === url)) {
          sources.push({ sourceKind: SourceKind.OTHER, url, notes: null });
        }
      }
      if (!sources.some((source) => source.url === input.homepageUrl)) {
        sources.push({ sourceKind: SourceKind.OFFICIAL_HOMEPAGE, url: input.homepageUrl, notes: null });
      }

      let apiId: string;
      let action: RevisionAction;
      let summary: string;
      if (submission.kind === SubmissionKind.CREATE) {
        if (submission.targetApiId) throw new Error("A CREATE submission must not reference an existing API.");

        const base = slugify(input.name, 160) || "api";
        let apiSlug = base;
        let suffix = 2;
        while (await tx.api.findUnique({ where: { slug: apiSlug }, select: { id: true } })) {
          const tail = `-${suffix++}`;
          apiSlug = `${base.slice(0, 160 - tail.length)}${tail}`;
        }

        const api = await tx.api.create({
          data: {
            slug: apiSlug,
            name: input.name,
            summary: input.summary,
            description: input.description ?? null,
            providerId: provider.id,
            homepageUrl: input.homepageUrl,
            documentationUrl: input.documentationUrl ?? null,
            baseUrl: input.baseUrl ?? null,
            pricingModel: input.pricingModel,
            pricingSummary: input.pricingSummary ?? null,
            status: ApiStatus.ACTIVE,
            verificationStatus: VerificationStatus.PENDING_REVIEW,
            publishedAt: null,
            categories: { create: categories.map((category) => ({ category: { connect: { id: category.id } } })) },
            authMethods: { create: input.authMethods.map((method) => ({ method })) },
          },
        });
        apiId = api.id;
        action = RevisionAction.CREATED;
        summary = "Created from an approved community submission; awaiting maintainer verification.";
        await upsertApiSources(tx, apiId, input.homepageUrl, input.documentationUrl, sources);
      } else {
        if (!submission.targetApiId) throw new Error("An UPDATE submission must reference an existing API.");
        const existing = await tx.api.findUnique({ where: { id: submission.targetApiId }, select: { id: true } });
        if (!existing) throw new Error("The API targeted by this update no longer exists.");

        const api = await tx.api.update({
          where: { id: existing.id },
          data: {
            name: input.name,
            summary: input.summary,
            description: input.description ?? null,
            providerId: provider.id,
            homepageUrl: input.homepageUrl,
            documentationUrl: input.documentationUrl ?? null,
            baseUrl: input.baseUrl ?? null,
            pricingModel: input.pricingModel,
            pricingSummary: input.pricingSummary ?? null,
            verificationStatus: VerificationStatus.PENDING_REVIEW,
            publishedAt: null,
            categories: {
              deleteMany: {},
              create: categories.map((category) => ({ category: { connect: { id: category.id } } })),
            },
            authMethods: {
              deleteMany: {},
              create: input.authMethods.map((method) => ({ method })),
            },
          },
        });
        apiId = api.id;
        action = RevisionAction.UPDATED;
        summary = "Applied an approved community update; API returned to pending verification.";
        await upsertApiSources(tx, apiId, input.homepageUrl, input.documentationUrl, sources);
      }

      const snapshot = await tx.api.findUniqueOrThrow({
        where: { id: apiId },
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
          action,
          summary,
          snapshot: {
            slug: snapshot.slug,
            name: snapshot.name,
            summary: snapshot.summary,
            description: snapshot.description,
            provider: snapshot.provider.name,
            homepageUrl: snapshot.homepageUrl,
            documentationUrl: snapshot.documentationUrl,
            baseUrl: snapshot.baseUrl,
            pricingModel: snapshot.pricingModel,
            pricingSummary: snapshot.pricingSummary,
            status: snapshot.status,
            verificationStatus: snapshot.verificationStatus,
            categorySlugs: snapshot.categories.map((item) => item.category.slug),
            authMethods: snapshot.authMethods.map((item) => item.method),
            sources: snapshot.sources.map((source) => ({
              sourceKind: source.sourceKind,
              url: source.url,
              isOfficial: source.isOfficial,
            })),
          },
        },
      });

      await tx.apiSubmission.update({
        where: { id: submissionId },
        data: {
          status: SubmissionStatus.APPROVED,
          reviewedAt: new Date(),
          reviewNote: reviewerNote || "Approved and applied to the catalogue. The API remains pending verification.",
        },
      });

      return snapshot.slug;
}
