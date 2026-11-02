import { NextResponse } from "next/server";
import { getApiBySlug } from "@/lib/catalogue/queries";
import { toPublicApiDetail } from "@/lib/catalogue/serializers";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;

  try {
    const result = await getApiBySlug(slug);

    if (result.databaseStatus !== "ready") {
      return NextResponse.json(
        { error: "catalogue_unavailable", message: "The APIVault catalogue database is not configured." },
        { status: 503 },
      );
    }

    if (!result.api) {
      return NextResponse.json(
        { error: "not_found", message: "No verified API was found for this slug." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { data: toPublicApiDetail(result.api) },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("GET /api/v1/apis/[slug] failed:", error);
    return NextResponse.json(
      { error: "internal_error", message: "The catalogue entry could not be queried." },
      { status: 500 },
    );
  }
}
