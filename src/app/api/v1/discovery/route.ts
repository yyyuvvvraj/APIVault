import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { enforcePublicApiRateLimit } from "@/lib/api-rate-limit";
import { withRequestContext } from "@/lib/request-context";

export const GET = withRequestContext("/api/v1/discovery", async function GET(request: NextRequest) {
  let rateLimit: Awaited<ReturnType<typeof enforcePublicApiRateLimit>>;
  try {
    rateLimit = await enforcePublicApiRateLimit(request);
  } catch (error) {
    console.error("GET /api/v1/discovery rate limit failed:", error);
    return NextResponse.json({ error: "service_unavailable", message: "The API is temporarily unavailable." }, { status: 503 });
  }
  if (rateLimit.response) return rateLimit.response;

  const params = request.nextUrl.searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 100);
  const priority = ["HIGH", "NORMAL", "LOW"].includes(params.get("priority") ?? "") ? params.get("priority")! : undefined;
  const disposition = ["READY_FOR_MAINTAINER_REVIEW", "REVIEW_REQUIRED"].includes(params.get("disposition") ?? "") ? params.get("disposition")! : undefined;
  const pageValue = Number.parseInt(params.get("page") ?? "1", 10);
  const limitValue = Number.parseInt(params.get("limit") ?? "30", 10);
  const page = Number.isFinite(pageValue) && pageValue > 0 ? Math.min(pageValue, 10000) : 1;
  const limit = Number.isFinite(limitValue) && limitValue > 0 ? Math.min(limitValue, 100) : 30;
  const where: Prisma.DiscoveryLeadWhereInput = {
    ...(priority ? { priority } : {}),
    ...(disposition ? { disposition } : {}),
    ...(q ? { OR: [
      { name: { contains: q, mode: "insensitive" } },
      { originalUrl: { contains: q, mode: "insensitive" } },
      { canonicalUrl: { contains: q, mode: "insensitive" } },
      { sourceCategory: { contains: q, mode: "insensitive" } },
      { suggestedCategory: { contains: q, mode: "insensitive" } },
    ] } : {}),
  };

  try {
    const prisma = getPrisma();
    const [total, filteredTotal, highPriority, readyForReview, records] = await Promise.all([
      prisma.discoveryLead.count(),
      prisma.discoveryLead.count({ where }),
      prisma.discoveryLead.count({ where: { priority: "HIGH" } }),
      prisma.discoveryLead.count({ where: { disposition: "READY_FOR_MAINTAINER_REVIEW" } }),
      prisma.discoveryLead.findMany({
        where,
        orderBy: [{ priority: "asc" }, { name: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          reviewId: true, name: true, originalUrl: true, canonicalUrl: true,
          sourceCategory: true, suggestedCategory: true, priority: true,
          disposition: true, evidenceIssues: true, automatedResearch: true,
          verificationStatus: true, publicationStatus: true, humanReviewRequired: true,
          importedAt: true, updatedAt: true,
        },
      }),
    ]);
    const payload = {
      data: records,
      notice: "Discovery leads are unverified research candidates, not published API listings. Automated evidence is not authenticated and requires human review.",
      counts: { total, highPriority, readyForReview },
      pagination: { page, limit, total: filteredTotal, totalPages: Math.ceil(filteredTotal / limit) },
    };
    return NextResponse.json(payload, {
      headers: { ...rateLimit.headers, "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("GET /api/v1/discovery failed:", error);
    return NextResponse.json({ error: "internal_error", message: "The discovery catalogue could not be queried." }, { status: 500, headers: rateLimit.headers });
  }
});
