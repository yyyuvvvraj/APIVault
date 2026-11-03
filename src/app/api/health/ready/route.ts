import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { evaluateReadiness } from "@/lib/ops/readiness";

export async function GET() {
  const result = await evaluateReadiness(() => getPrisma().$queryRaw`SELECT 1`);

  return NextResponse.json(result.body, {
    status: result.httpStatus,
    headers: { "Cache-Control": "no-store" },
  });
}
