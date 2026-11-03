import { NextResponse } from "next/server";
import { withRequestContext } from "@/lib/request-context";
import { listCategories } from "@/lib/catalogue/queries";
import { enforcePublicApiRateLimit } from "@/lib/api-rate-limit";
import { createEtag, matchesIfNoneMatch } from "@/lib/http-etag";

export const GET = withRequestContext("/api/v1/categories", async function GET(request: Request) {
  let rateLimit: Awaited<ReturnType<typeof enforcePublicApiRateLimit>>;
  try {
    rateLimit = await enforcePublicApiRateLimit(request);
  } catch (error) {
    console.error("GET /api/v1/categories rate limit failed:", error);
    return NextResponse.json({ error: "service_unavailable", message: "The API is temporarily unavailable." }, { status: 503 });
  }
  if (rateLimit.response) return rateLimit.response;

  try {
    const result = await listCategories();
    if (result.databaseStatus !== "ready") {
      return NextResponse.json(
        { error: "catalogue_unavailable", message: "The APIVault catalogue database is not configured." },
        { status: 503, headers: rateLimit.headers },
      );
    }
    const payload = { data: result.categories };
    const headers = {
      ...rateLimit.headers,
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=900",
      ETag: createEtag(payload),
    };
    if (matchesIfNoneMatch(request.headers.get("if-none-match"), headers.ETag)) {
      return new NextResponse(null, { status: 304, headers });
    }
    return NextResponse.json(payload, { headers });
  } catch (error) {
    console.error("GET /api/v1/categories failed:", error);
    return NextResponse.json(
      { error: "internal_error", message: "The categories could not be queried." },
      { status: 500, headers: rateLimit.headers },
    );
  }
});
