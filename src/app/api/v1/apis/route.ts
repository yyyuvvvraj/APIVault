import { NextRequest, NextResponse } from "next/server";
import { listApis } from "@/lib/catalogue/queries";
import { parseCatalogueFilters } from "@/lib/catalogue/search";
import { toPublicApiCard } from "@/lib/catalogue/serializers";

export async function GET(request: NextRequest) {
  const filters = parseCatalogueFilters(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
    20,
  );

  try {
    const result = await listApis(filters);

    if (result.databaseStatus !== "ready") {
      return NextResponse.json(
        { error: "catalogue_unavailable", message: "The APIVault catalogue database is not configured." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        data: result.items.map(toPublicApiCard),
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("GET /api/v1/apis failed:", error);
    return NextResponse.json(
      { error: "internal_error", message: "The catalogue could not be queried." },
      { status: 500 },
    );
  }
}
