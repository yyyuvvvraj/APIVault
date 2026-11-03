import { NextRequest, NextResponse } from "next/server";
import { withRequestContext } from "@/lib/request-context";
import { listApis } from "@/lib/catalogue/queries";
import { parseCatalogueFilters } from "@/lib/catalogue/search";
import { toPublicApiCard } from "@/lib/catalogue/serializers";
import { enforcePublicApiRateLimit } from "@/lib/api-rate-limit";
import { createEtag, matchesIfNoneMatch } from "@/lib/http-etag";

export const GET = withRequestContext("/api/v1/apis", async function GET(request: NextRequest) {
  let rateLimit: Awaited<ReturnType<typeof enforcePublicApiRateLimit>>;
  try {
    rateLimit = await enforcePublicApiRateLimit(request);
  } catch (error) {
    console.error("GET /api/v1/apis rate limit failed:", error);
    return NextResponse.json({ error: "service_unavailable", message: "The API is temporarily unavailable." }, { status: 503 });
  }
  if (rateLimit.response) return rateLimit.response;

  const filters = parseCatalogueFilters(Object.fromEntries(request.nextUrl.searchParams.entries()), 20);
  try {
    const result = await listApis(filters);
    if (result.databaseStatus !== "ready") {
      return NextResponse.json(
        { error: "catalogue_unavailable", message: "The APIVault catalogue database is not configured." },
        { status: 503, headers: rateLimit.headers },
      );
    }
    const payload = {
      data: result.items.map(toPublicApiCard),
      pagination: { page: filters.page, limit: filters.limit, total: result.total, totalPages: result.totalPages },
    };
    const headers = {
      ...rateLimit.headers,
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
      ETag: createEtag(payload),
    };
    if (matchesIfNoneMatch(request.headers.get("if-none-match"), headers.ETag)) {
      return new NextResponse(null, { status: 304, headers });
    }
    return NextResponse.json(payload, { headers });
  } catch (error) {
    console.error("GET /api/v1/apis failed:", error);
    return NextResponse.json(
      { error: "internal_error", message: "The catalogue could not be queried." },
      { status: 500, headers: rateLimit.headers },
    );
  }
});
