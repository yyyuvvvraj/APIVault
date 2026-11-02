import { NextResponse } from "next/server";
import { listCategories } from "@/lib/catalogue/queries";

export async function GET() {
  try {
    const result = await listCategories();

    if (result.databaseStatus !== "ready") {
      return NextResponse.json(
        { error: "catalogue_unavailable", message: "The APIVault catalogue database is not configured." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { data: result.categories },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=900" } },
    );
  } catch (error) {
    console.error("GET /api/v1/categories failed:", error);
    return NextResponse.json(
      { error: "internal_error", message: "The categories could not be queried." },
      { status: 500 },
    );
  }
}
