import { NextResponse } from "next/server";
import { getApiBySlug } from "@/lib/catalogue/queries";
import { toPublicApiDetail } from "@/lib/catalogue/serializers";
import { enforcePublicApiRateLimit } from "@/lib/api-rate-limit";
import { createEtag, matchesIfNoneMatch } from "@/lib/http-etag";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  let rateLimit: Awaited<ReturnType<typeof enforcePublicApiRateLimit>>;
  try {
    rateLimit = await enforcePublicApiRateLimit(request);
  } catch (error) {
    console.error("GET /api/v1/apis/[slug] rate limit failed:", error);
    return NextResponse.json({ error: "service_unavailable", message: "The API is temporarily unavailable." }, { status: 503 });
  }
  if (rateLimit.response) return rateLimit.response;

  const { slug } = await context.params;
  try {
    const result = await getApiBySlug(slug);
    if (result.databaseStatus !== "ready") {
      return NextResponse.json(
        { error: "catalogue_unavailable", message: "The APIVault catalogue database is not configured." },
        { status: 503, headers: rateLimit.headers },
      );
    }
    if (!result.api) {
      return NextResponse.json(
        { error: "not_found", message: "No verified API was found for this slug." },
        { status: 404, headers: rateLimit.headers },
      );
    }
    const payload = { data: toPublicApiDetail(result.api) };
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
    console.error("GET /api/v1/apis/[slug] failed:", error);
    return NextResponse.json(
      { error: "internal_error", message: "The catalogue entry could not be queried." },
      { status: 500, headers: rateLimit.headers },
    );
  }
}
