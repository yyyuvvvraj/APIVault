"use server";

import { revalidatePath } from "next/cache";
import { RevisionAction, SourceKind } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCreateApiSchema } from "@/lib/validation/admin-api";

export type EditApiState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Record<string, string[]>;
};

function stringField(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}

function stringArray(data: FormData, key: string) {
  return data.getAll(key).filter((value): value is string => typeof value === "string");
}

export async function updateApiAction(
  _previous: EditApiState,
  formData: FormData,
): Promise<EditApiState> {
  await requireAdmin();

  const apiId = stringField(formData, "apiId");
  if (!apiId || !/^[0-9a-f-]{36}$/i.test(apiId)) {
    return { status: "error", message: "The API record identifier is invalid." };
  }

  const parsed = adminCreateApiSchema.safeParse({
    name: stringField(formData, "name"),
    providerName: stringField(formData, "providerName"),
    summary: stringField(formData, "summary"),
    description: stringField(formData, "description"),
    homepageUrl: stringField(formData, "homepageUrl"),
    documentationUrl: stringField(formData, "documentationUrl"),
    baseUrl: stringField(formData, "baseUrl"),
    categorySlugs: stringArray(formData, "categorySlugs"),
    authMethods: stringArray(formData, "authMethods"),
    pricingModel: stringField(formData, "pricingModel"),
    pricingSummary: stringField(formData, "pricingSummary"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const input = parsed.data;
  const prisma = getPrisma();

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.api.findUnique({
        where: { id: apiId },
        select: { id: true, slug: true, providerId: true },
      });
      if (!current) throw new Error("The API record no longer exists. Refresh the page.");

      const categories = await tx.category.findMany({
        where: { slug: { in: input.categorySlugs } },
        select: { id: true, slug: true },
      });
      if (categories.length !== input.categorySlugs.length) {
        throw new Error("One or more selected categories no longer exist. Refresh the page.");
      }

      let provider = await tx.apiProvider.findFirst({
        where: { name: { equals: input.providerName, mode: "insensitive" } },
        select: { id: true, slug: true, name: true },
      });

      if (!provider) {
        const base = input.providerName.normalize("NFKD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
          .slice(0, 120) || "provider";
        let slug = base;
        let suffix = 2;
        while (await tx.apiProvider.findUnique({ where: { slug }, select: { id: true } })) {
          const tail = `-${suffix++}`;
          slug = `${base.slice(0, 120 - tail.length)}${tail}`;
        }
        provider = await tx.apiProvider.create({
          data: { slug, name: input.providerName },
          select: { id: true, slug: true, name: true },
        });
      }

      const duplicate = await tx.api.findFirst({
        where: {
          id: { not: apiId },
          providerId: provider.id,
          name: { equals: input.name, mode: "insensitive" },
        },
        select: { slug: true },
      });
      if (duplicate) {
        throw new Error(`Another API with this name already exists for the selected provider (/${duplicate.slug}).`);
      }

      await tx.api.update({
        where: { id: apiId },
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
          categories: {
            deleteMany: {},
            create: categories.map((category) => ({
              category: { connect: { id: category.id } },
            })),
          },
          authMethods: {
            deleteMany: {},
            create: input.authMethods.map((method) => ({ method })),
          },
        },
      });

      const sourceRows = [
        { sourceKind: SourceKind.OFFICIAL_HOMEPAGE, url: input.homepageUrl },
        ...(input.documentationUrl && input.documentationUrl !== input.homepageUrl
          ? [{ sourceKind: SourceKind.DOCUMENTATION, url: input.documentationUrl }]
          : []),
      ];
      for (const source of sourceRows) {
        await tx.apiSource.upsert({
          where: { apiId_url: { apiId, url: source.url } },
          create: { apiId, sourceKind: source.sourceKind, url: source.url, isOfficial: true },
          update: { sourceKind: source.sourceKind, isOfficial: true },
        });
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
          action: RevisionAction.UPDATED,
          summary: "Updated from the admin console.",
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
    });

    revalidatePath("/admin");
    revalidatePath("/admin/apis");
    revalidatePath(`/admin/apis/${stringField(formData, "slug")}/edit`);
    return { status: "success", message: "API details updated. Its verification state has not been changed." };
  } catch (error) {
    console.error("Admin API update failed:", error);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { status: "error", message: "A conflicting record already exists. Check the provider and API name." };
    }
    return {
      status: "error",
      message: error instanceof Error ? error.message : "The API could not be updated.",
    };
  }
}
