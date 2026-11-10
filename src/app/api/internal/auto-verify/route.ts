import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { ApiStatus, VerificationStatus } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { updateApiLifecycle } from "@/lib/catalogue/lifecycle-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type URLCheck = {
  url: string;
  finalUrl?: string;
  statusCode?: number;
  reachable: boolean;
};

type ValidationResult = {
  slug: string;
  homepageUrl: string;
  documentationUrl?: string;
  name: string;
  provider: string;
  verdict: string;
  autoApprove: boolean;
  autoApprovalReasons?: string[];
  checks: URLCheck[];
  duplicateOf?: string;
};

type ValidationReport = {
  total: number;
  results: ValidationResult[];
  conflicts: { apiSlug: string; conflictingApiSlug: string }[];
};

function authorized(request: Request): boolean {
  const expected = process.env.APIVAULT_AUTO_VERIFY_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !supplied) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

function sameProviderDomain(left: string, right: string): boolean {
  const a = left.toLowerCase().replace(/\.$/, "");
  const b = right.toLowerCase().replace(/\.$/, "");
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
}

function allEvidenceReachable(result: ValidationResult, urls: string[]): boolean {
  const checks = new Map(result.checks.map((check) => [check.url, check]));
  return urls.every((url) => {
    const check = checks.get(url);
    return Boolean(check?.reachable && check.statusCode && check.statusCode >= 200 && check.statusCode < 400 &&
      check.finalUrl?.startsWith("https://"));
  });
}

function response(status: number, body: unknown) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  if (!authorized(request)) return response(401, { error: "Unauthorized." });

  try {
    const records = await getPrisma().api.findMany({
      where: {
        status: ApiStatus.ACTIVE,
        verificationStatus: { in: [VerificationStatus.UNVERIFIED, VerificationStatus.PENDING_REVIEW, VerificationStatus.STALE] },
        publishedAt: null,
        featured: false,
        homepageUrl: { startsWith: "https://" },
        documentationUrl: { startsWith: "https://" },
        OR: [{ baseUrl: null }, { baseUrl: { startsWith: "https://" } }],
        categories: { some: {} },
        authMethods: { some: {} },
        sources: {
          some: { sourceKind: "OFFICIAL_HOMEPAGE", isOfficial: true },
          every: { url: { startsWith: "https://" } },
        },
        name: { not: "" },
        summary: { not: "" },
      },
      take: 1000,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: {
        provider: true,
        categories: { include: { category: true } },
        authMethods: true,
        sources: true,
      },
    });

    const apis = records.map((api) => ({
      slug: api.slug,
      name: api.name,
      summary: api.summary,
      description: api.description ?? undefined,
      provider: {
        slug: api.provider.slug,
        name: api.provider.name,
        description: api.provider.description ?? undefined,
        homepageUrl: undefined,
      },
      homepageUrl: api.homepageUrl,
      documentationUrl: api.documentationUrl ?? undefined,
      baseUrl: api.baseUrl ?? undefined,
      pricingModel: api.pricingModel,
      pricingSummary: api.pricingSummary ?? undefined,
      status: api.status,
      verificationStatus: api.verificationStatus,
      featured: api.featured,
      categories: api.categories.map((item) => item.category.slug),
      authMethods: api.authMethods.map((item) => ({
        method: item.method,
        details: item.details ?? undefined,
      })),
      sources: api.sources.map((source) => ({
        kind: source.sourceKind,
        url: source.url,
        title: source.title ?? undefined,
        isOfficial: source.isOfficial,
        notes: source.notes ?? undefined,
      })),
    }));

    return response(200, {
      apis,
      dataset: {
        name: "APIVault pending catalogue snapshot",
        sourceUrl: "https://github.com/yyyuvvvraj/APIVault",
        version: "live-database-snapshot",
        retrievedAt: new Date().toISOString(),
        license: "NOASSERTION",
        attribution: "Internal APIVault database snapshot; provider rights are evaluated separately.",
      },
    });
  } catch (error) {
    console.error("Auto-verification candidate export failed:", error);
    return response(500, { error: "Could not export pending catalogue records." });
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) return response(401, { error: "Unauthorized." });

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 15 * 1024 * 1024) return response(413, { error: "Validation report exceeds 15 MiB." });

  let report: ValidationReport;
  try {
    report = await request.json() as ValidationReport;
  } catch {
    return response(400, { error: "Invalid JSON validation report." });
  }
  if (!Array.isArray(report.results) || report.results.length > 5000 || report.total !== report.results.length) {
    return response(400, { error: "Invalid validation report shape or candidate count." });
  }

  const prisma = getPrisma();
  const approved: string[] = [];
  const held: { slug: string; reason: string }[] = [];
  const seen = new Set<string>();

  for (const result of report.results) {
    if (!result || typeof result.slug !== "string" || seen.has(result.slug)) {
      held.push({ slug: result?.slug ?? "unknown", reason: "duplicate or invalid report entry" });
      continue;
    }
    seen.add(result.slug);

    if (!result.autoApprove || result.verdict !== "VALIDATED_CANDIDATE" || result.duplicateOf) {
      held.push({ slug: result.slug, reason: (result.autoApprovalReasons ?? ["automated policy did not approve this record"]).join("; ") });
      continue;
    }
    if (report.conflicts?.some((conflict) => conflict.apiSlug === result.slug || conflict.conflictingApiSlug === result.slug)) {
      held.push({ slug: result.slug, reason: "catalogue conflict detected" });
      continue;
    }

    try {
      const api = await prisma.api.findUnique({
        where: { slug: result.slug },
        include: {
          provider: { select: { name: true } },
          categories: { include: { category: { select: { slug: true } } } },
          authMethods: { select: { method: true } },
          sources: { select: { sourceKind: true, url: true, isOfficial: true } },
        },
      });
      if (!api || result.homepageUrl !== api.homepageUrl || result.documentationUrl !== api.documentationUrl ||
          result.name !== api.name || result.provider !== api.provider.name ||
          api.status !== ApiStatus.ACTIVE ||
          ![VerificationStatus.UNVERIFIED, VerificationStatus.PENDING_REVIEW, VerificationStatus.STALE].includes(api.verificationStatus) ||
          api.publishedAt || api.featured) {
        held.push({ slug: result.slug, reason: "record is missing, already published, featured, or not eligible" });
        continue;
      }

      const homepageSource = api.sources.some((source) =>
        source.sourceKind === "OFFICIAL_HOMEPAGE" && source.isOfficial && source.url === api.homepageUrl);
      const docsSource = Boolean(api.documentationUrl) && api.sources.some((source) =>
        source.sourceKind === "DOCUMENTATION" && source.isOfficial && source.url === api.documentationUrl);
      if (!homepageSource || !docsSource || !api.documentationUrl ||
          !sameProviderDomain(new URL(api.homepageUrl).hostname, new URL(api.documentationUrl).hostname) ||
          api.categories.length === 0 || api.authMethods.length === 0) {
        held.push({ slug: result.slug, reason: "required official homepage, same-provider documentation, category, or auth evidence is missing" });
        continue;
      }

      if (api.pricingModel !== "UNKNOWN" && !api.sources.some((source) =>
        source.sourceKind === "PRICING" && source.isOfficial)) {
        held.push({ slug: result.slug, reason: "known pricing claims lack official pricing evidence" });
        continue;
      }
      if (api.authMethods.some((method) => method.method !== "UNKNOWN") && !api.sources.some((source) =>
        source.sourceKind === "AUTHENTICATION" && source.isOfficial)) {
        held.push({ slug: result.slug, reason: "known authentication claims lack official authentication evidence" });
        continue;
      }

      const requiredUrls = [...new Set([
        api.homepageUrl,
        api.documentationUrl,
        ...api.sources.map((source) => source.url),
      ])];
      if (!allEvidenceReachable(result, requiredUrls)) {
        held.push({ slug: result.slug, reason: "one or more evidence URLs did not pass the live HTTPS checks" });
        continue;
      }
      const checkedUrls = new Map(result.checks.map((check) => [check.url, check]));
      const homepageFinal = new URL(checkedUrls.get(api.homepageUrl)!.finalUrl!);
      const documentationFinal = new URL(checkedUrls.get(api.documentationUrl)!.finalUrl!);
      if (!sameProviderDomain(new URL(api.homepageUrl).hostname, homepageFinal.hostname) ||
          !sameProviderDomain(new URL(api.homepageUrl).hostname, documentationFinal.hostname)) {
        held.push({ slug: result.slug, reason: "homepage or documentation redirected outside the provider domain" });
        continue;
      }

      const duplicate = await prisma.api.findFirst({
        where: {
          id: { not: api.id },
          status: { not: ApiStatus.ARCHIVED },
          OR: [
            { providerId: api.providerId, name: { equals: api.name, mode: "insensitive" } },
            { homepageUrl: { equals: api.homepageUrl, mode: "insensitive" } },
          ],
        },
        select: { slug: true },
      });
      if (duplicate) {
        held.push({ slug: result.slug, reason: `possible duplicate of ${duplicate.slug}` });
        continue;
      }

      const note = "Automated verification policy v1.0: exact official homepage and documentation source URLs; reachable HTTPS evidence; conservative same-provider host relationship; required category and authentication metadata; pricing/authentication claims supported by linked official sources; no detected duplicate. Automated checks do not independently certify provider ownership or legal rights.";
      await prisma.$transaction((tx) =>
        updateApiLifecycle(tx, api.id, VerificationStatus.VERIFIED, ApiStatus.ACTIVE, note));
      approved.push(result.slug);
    } catch (error) {
      console.error(`Auto-verification failed for ${result.slug}:`, error);
      held.push({ slug: result.slug, reason: error instanceof Error ? error.message : "verification failed" });
    }
  }

  if (approved.length > 0) {
    revalidatePath("/");
    revalidatePath("/apis");
    revalidatePath("/admin/apis");
  }

  return response(200, { approvedCount: approved.length, heldCount: held.length, approved, held });
}
