"use server";

import { revalidatePath } from "next/cache";
import {
  ApiStatus,
  PricingModel,
  RevisionAction,
  SourceKind,
  VerificationStatus,
} from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCreateApiSchema } from "@/lib/validation/admin-api";

type CreateApiState = {
  status: "idle" | "error" | "success";
  message: string;
  createdSlug?: string;
  fieldErrors?: Record<string, string[]>;
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formStringArray(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === "string");
}

function slugify(value: string, maxLength = 160) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
}

export async function createApiAction(
  _previousState: CreateApiState,
  formData: FormData,
): Promise<CreateApiState> {
  await requireAdmin();

  const parsed = adminCreateApiSchema.safeParse({
    name: formString(formData, "name"),
    providerName: formString(formData, "providerName"),
    summary: formString(formData, "summary"),
    description: formString(formData, "description"),
    homepageUrl: formString(formData, "homepageUrl"),
    documentationUrl: formString(formData, "documentationUrl"),
    baseUrl: formString(formData, "baseUrl"),
    categorySlugs: formStringArray(formData, "categorySlugs"),
    authMethods: formStringArray(formData, "authMethods"),
    pricingModel: formString(formData, "pricingModel"),
    pricingSummary: formString(formData, "pricingSummary"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const input = parsed.data;
  const apiBaseSlug = slugify(input.name) || "api";
  const providerBaseSlug = slugify(input.providerName, 120) || "provider";

  try {
    const created = await getPrisma().$transaction(async (tx) => {
      const categories = await tx.category.findMany({
        where: { slug: { in: input.categorySlugs } },
        select: { id: true, slug: true },
      });

      if (categories.length !== input.categorySlugs.length) {
        throw new Error("One or more selected categories no longer exist. Refresh the page and try again.");
      }

      let provider = await tx.apiProvider.findFirst({
        where: { name: { equals: input.providerName, mode: "insensitive" } },
      });

      if (!provider) {
        let providerSlug = providerBaseSlug;
        let suffix = 2;

        while (await tx.apiProvider.findUnique({ where: { slug: providerSlug }, select: { id: true } })) {
          const suffixText = `-${suffix++}`;
          providerSlug = `${providerBaseSlug.slice(0, 120 - suffixText.length)}${suffixText}`;
        }

        provider = await tx.apiProvider.create({
          data: {
            slug: providerSlug,
            name: input.providerName,
          },
        });
      }

      const duplicateApi = await tx.api.findFirst({
        where: {
          name: { equals: input.name, mode: "insensitive" },
          providerId: provider.id,
        },
        select: { slug: true },
      });

      if (duplicateApi) {
        throw new Error(`An API with this name already exists for this provider (/${duplicateApi.slug}). Use the existing record instead.`);
      }

      let apiSlug = apiBaseSlug;
      let suffix = 2;

      while (await tx.api.findUnique({ where: { slug: apiSlug }, select: { id: true } })) {
        const suffixText = `-${suffix++}`;
        apiSlug = `${apiBaseSlug.slice(0, 160 - suffixText.length)}${suffixText}`;
      }

      const sources = [
        {
          sourceKind: SourceKind.OFFICIAL_HOMEPAGE,
          url: input.homepageUrl,
          isOfficial: true,
        },
        ...(input.documentationUrl && input.documentationUrl !== input.homepageUrl
          ? [{
              sourceKind: SourceKind.DOCUMENTATION,
              url: input.documentationUrl,
              isOfficial: true,
            }]
          : []),
      ];

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
          pricingModel: input.pricingModel as PricingModel,
          pricingSummary: input.pricingSummary ?? null,
          status: ApiStatus.ACTIVE,
          verificationStatus: VerificationStatus.PENDING_REVIEW,
          publishedAt: null,
          categories: {
            create: categories.map((category) => ({
              category: { connect: { id: category.id } },
            })),
          },
          authMethods: {
            create: input.authMethods.map((method) => ({ method })),
          },
          sources: {
            create: sources,
          },
        },
        include: {
          provider: { select: { name: true } },
          categories: { include: { category: { select: { slug: true } } } },
          authMethods: { select: { method: true } },
          sources: { select: { sourceKind: true, url: true } },
        },
      });

      await tx.apiRevision.create({
        data: {
          apiId: api.id,
          action: RevisionAction.CREATED,
          summary: "Created in the admin console; awaiting verification.",
          snapshot: {
            slug: api.slug,
            name: api.name,
            summary: api.summary,
            description: api.description,
            provider: api.provider.name,
            homepageUrl: api.homepageUrl,
            documentationUrl: api.documentationUrl,
            baseUrl: api.baseUrl,
            pricingModel: api.pricingModel,
            pricingSummary: api.pricingSummary,
            status: api.status,
            verificationStatus: api.verificationStatus,
            categorySlugs: api.categories.map((item) => item.category.slug),
            authMethods: api.authMethods.map((item) => item.method),
            sources: api.sources.map((source) => ({
              sourceKind: source.sourceKind,
              url: source.url,
            })),
          },
        },
      });

      return { id: api.id, slug: api.slug };
    });

    revalidatePath("/admin");
    revalidatePath("/admin/apis");

    return {
      status: "success",
      message: "API created successfully. It is pending verification and is not publicly listed.",
      createdSlug: created.slug,
    };
  } catch (error) {
    console.error("Admin API creation failed:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return {
        status: "error",
        message: "A record with one of these identifiers already exists. Please retry; if the issue continues, contact the maintainer.",
      };
    }

    return {
      status: "error",
      message: error instanceof Error
        ? error.message
        : "The API could not be created. Please try again.",
    };
  }
}
