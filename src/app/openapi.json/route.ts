import { NextResponse } from "next/server";
import openApiDocument from "@/lib/openapi.json";

export function GET() {
  return NextResponse.json(openApiDocument, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
